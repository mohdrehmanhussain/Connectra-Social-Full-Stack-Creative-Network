"""
REST API Views for Aether Social Media Platform using Django REST Framework.
"""
import re
from django.contrib.auth import authenticate, login, logout
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Bookmark,
    Comment,
    CommentLike,
    Follow,
    Like,
    Message,
    Notification,
    Post,
    Story,
    User,
)
from .serializers import (
    CommentSerializer,
    MessageSerializer,
    NotificationSerializer,
    PostSerializer,
    RegisterSerializer,
    StorySerializer,
    UserSummarySerializer,
)


def extract_hashtags(text: str):
    return list(dict.fromkeys(re.findall(r"#(\w+)", text or "")))


def extract_mentions(text: str):
    return list(dict.fromkeys(re.findall(r"@(\w+)", text or "")))


class RegisterAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            return Response(
                {
                    "token": token.key,
                    "user": UserSummarySerializer(user, context={"request": request}).data,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        identifier = request.data.get("username", "").strip()
        password = request.data.get("password", "")
        user_obj = User.objects.filter(Q(username__iexact=identifier) | Q(email__iexact=identifier)).first()
        username = user_obj.username if user_obj else identifier
        user = authenticate(request, username=username, password=password)
        if not user:
            return Response(
                {"error": "Invalid username/email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        login(request, user)
        user.is_online = True
        user.save(update_fields=["is_online"])
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                "token": token.key,
                "user": UserSummarySerializer(user, context={"request": request}).data,
            }
        )


class LogoutAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        request.user.is_online = False
        request.user.save(update_fields=["is_online"])
        Token.objects.filter(user=request.user).delete()
        logout(request)
        return Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)


class UsersListAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        users = User.objects.all()
        return Response(UserSummarySerializer(users, many=True, context={"request": request}).data)


class UserDetailAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        return Response(UserSummarySerializer(user, context={"request": request}).data)


class ProfileUpdateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request):
        user = request.user
        for field in ["full_name", "bio", "location", "website", "profile_picture", "cover_image"]:
            if field in request.data:
                setattr(user, field, request.data[field])
        user.save()
        return Response(UserSummarySerializer(user, context={"request": request}).data)


class PostListCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request):
        queryset = Post.objects.select_related("user").prefetch_related("likes", "comments")
        filter_type = request.query_params.get("filter", "all")
        user_id = request.query_params.get("user_id")
        hashtag = request.query_params.get("hashtag")

        if user_id:
            if filter_type == "liked":
                queryset = queryset.filter(likes__user_id=user_id)
            elif filter_type == "media":
                queryset = queryset.filter(user_id=user_id).exclude(image="")
            else:
                queryset = queryset.filter(user_id=user_id)
        elif filter_type == "following" and request.user.is_authenticated:
            following_ids = Follow.objects.filter(follower=request.user).values_list("following_id", flat=True)
            queryset = queryset.filter(Q(user_id__in=following_ids) | Q(user=request.user))
        elif filter_type == "popular":
            queryset = queryset.annotate(num_likes=Count("likes")).order_by("-num_likes", "-created_at")

        if hashtag:
            queryset = queryset.filter(content__icontains=f"#{hashtag}")

        serializer = PostSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request):
        content = request.data.get("content", "").strip()
        images = request.data.get("images", [])
        image = request.data.get("image", "") or (images[0] if images else "")
        if not content and not image:
            return Response(
                {"error": "Post cannot be empty. Provide text or at least one image."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        hashtags = extract_hashtags(content)
        mentions = extract_mentions(content)
        post = Post.objects.create(
            user=request.user,
            content=content,
            image=image,
            images=images if images else ([image] if image else []),
            location=request.data.get("location", ""),
            hashtags=hashtags,
            mentions=mentions,
        )
        for username in mentions:
            mentioned_user = User.objects.filter(username__iexact=username).first()
            if mentioned_user and mentioned_user != request.user:
                Notification.objects.create(
                    recipient=mentioned_user,
                    sender=request.user,
                    notification_type="mention",
                    post=post,
                )
        return Response(
            PostSerializer(post, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class PostDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def put(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        if post.user != request.user:
            return Response(
                {"error": "Unauthorized: You can only edit your own posts."},
                status=status.HTTP_403_FORBIDDEN,
            )
        content = request.data.get("content", post.content).strip()
        if not content and not post.image:
            return Response({"error": "Post content cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)
        post.content = content
        post.location = request.data.get("location", post.location)
        post.hashtags = extract_hashtags(content)
        post.mentions = extract_mentions(content)
        if "images" in request.data:
            post.images = request.data["images"]
            post.image = post.images[0] if post.images else ""
        post.save()
        return Response(PostSerializer(post, context={"request": request}).data)

    def delete(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        if post.user != request.user:
            return Response(
                {"error": "Unauthorized: You can only delete your own posts."},
                status=status.HTTP_403_FORBIDDEN,
            )
        post.delete()
        return Response({"message": "Post deleted."}, status=status.HTTP_200_OK)


class PostLikeToggleAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        like, created = Like.objects.get_or_create(user=request.user, post=post)
        if not created:
            like.delete()
            liked = False
        else:
            liked = True
            if post.user != request.user:
                Notification.objects.create(
                    recipient=post.user,
                    sender=request.user,
                    notification_type="like",
                    post=post,
                )
        return Response({"liked": liked, "likes_count": post.likes.count()})


class PostCommentCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        content = request.data.get("content", "").strip()
        if not content:
            return Response({"error": "Comment content cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)
        parent_id = request.data.get("parent_comment")
        parent_comment = get_object_or_404(Comment, pk=parent_id) if parent_id else None
        comment = Comment.objects.create(
            post=post,
            user=request.user,
            parent_comment=parent_comment,
            content=content,
        )
        if parent_comment and parent_comment.user != request.user:
            Notification.objects.create(
                recipient=parent_comment.user,
                sender=request.user,
                notification_type="reply",
                post=post,
                comment=comment,
            )
        elif post.user != request.user:
            Notification.objects.create(
                recipient=post.user,
                sender=request.user,
                notification_type="comment",
                post=post,
                comment=comment,
            )
        return Response(
            CommentSerializer(comment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class UserFollowAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        target = get_object_or_404(User, pk=pk)
        if target == request.user:
            return Response({"error": "You cannot follow yourself."}, status=status.HTTP_400_BAD_REQUEST)
        _, created = Follow.objects.get_or_create(follower=request.user, following=target)
        if created:
            Notification.objects.create(
                recipient=target,
                sender=request.user,
                notification_type="follow",
            )
        return Response(
            {
                "is_following": True,
                "followers_count": target.follower_relations.count(),
            }
        )


class UserUnfollowAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        target = get_object_or_404(User, pk=pk)
        Follow.objects.filter(follower=request.user, following=target).delete()
        return Response(
            {
                "is_following": False,
                "followers_count": target.follower_relations.count(),
            }
        )


class NotificationsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        notifs = Notification.objects.filter(recipient=request.user).select_related("sender")
        return Response(NotificationSerializer(notifs, many=True, context={"request": request}).data)


class MessagesAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        partner_id = request.query_params.get("user_id")
        if partner_id:
            msgs = Message.objects.filter(
                Q(sender=request.user, receiver_id=partner_id)
                | Q(sender_id=partner_id, receiver=request.user)
            )
            Message.objects.filter(sender_id=partner_id, receiver=request.user, is_read=False).update(is_read=True)
            return Response(MessageSerializer(msgs, many=True, context={"request": request}).data)
        msgs = Message.objects.filter(Q(sender=request.user) | Q(receiver=request.user))
        return Response(MessageSerializer(msgs, many=True, context={"request": request}).data)

    def post(self, request):
        receiver = get_object_or_404(User, pk=request.data.get("receiver_id"))
        content = request.data.get("content", "").strip()
        attachment = request.data.get("attachment", "")
        if not content and not attachment:
            return Response({"error": "Message cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)
        msg = Message.objects.create(
            sender=request.user,
            receiver=receiver,
            content=content,
            attachment=attachment,
        )
        return Response(MessageSerializer(msg, context={"request": request}).data, status=status.HTTP_201_CREATED)


class BookmarkToggleAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        posts = Post.objects.filter(bookmarked_by__user=request.user)
        return Response(PostSerializer(posts, many=True, context={"request": request}).data)

    def post(self, request):
        post = get_object_or_404(Post, pk=request.data.get("post_id"))
        bookmark, created = Bookmark.objects.get_or_create(user=request.user, post=post)
        if not created:
            bookmark.delete()
            return Response({"is_bookmarked": False})
        return Response({"is_bookmarked": True})


class StoriesAPIView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request):
        active_stories = Story.objects.filter(expires_at__gt=timezone.now()).select_related("user")
        return Response(StorySerializer(active_stories, many=True, context={"request": request}).data)

    def post(self, request):
        media = request.data.get("media", "")
        if not media:
            return Response({"error": "Story media is required."}, status=status.HTTP_400_BAD_REQUEST)
        story = Story.objects.create(
            user=request.user,
            media=media,
            caption=request.data.get("caption", ""),
        )
        return Response(StorySerializer(story, context={"request": request}).data, status=status.HTTP_201_CREATED)
