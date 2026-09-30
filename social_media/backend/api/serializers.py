"""
Django REST Framework Serializers for Aether Social Media Platform.
"""
from django.contrib.auth import password_validation
from rest_framework import serializers
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


class UserSummarySerializer(serializers.ModelSerializer):
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    posts_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "full_name",
            "profile_picture",
            "cover_image",
            "bio",
            "location",
            "website",
            "is_online",
            "created_at",
            "followers_count",
            "following_count",
            "posts_count",
            "is_following",
        ]

    def get_followers_count(self, obj):
        return obj.follower_relations.count()

    def get_following_count(self, obj):
        return obj.following_relations.count()

    def get_posts_count(self, obj):
        return obj.posts.count()

    def get_is_following(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return Follow.objects.filter(follower=request.user, following=obj).exists()
        return False


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "full_name",
            "password",
            "profile_picture",
            "bio",
            "location",
            "website",
        ]

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class CommentSerializer(serializers.ModelSerializer):
    user = UserSummarySerializer(read_only=True)
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            "id",
            "post",
            "user",
            "parent_comment",
            "content",
            "likes_count",
            "is_liked",
            "replies",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "post", "user", "created_at", "updated_at"]

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return CommentLike.objects.filter(user=request.user, comment=obj).exists()
        return False

    def get_replies(self, obj):
        replies_qs = obj.replies.all().order_by("created_at")
        return CommentSerializer(replies_qs, many=True, context=self.context).data


class PostSerializer(serializers.ModelSerializer):
    user = UserSummarySerializer(read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_bookmarked = serializers.SerializerMethodField()
    comments = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id",
            "user",
            "content",
            "image",
            "images",
            "location",
            "hashtags",
            "mentions",
            "shares_count",
            "likes_count",
            "comments_count",
            "is_liked",
            "is_bookmarked",
            "comments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_is_liked(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return Like.objects.filter(user=request.user, post=obj).exists()
        return False

    def get_is_bookmarked(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return Bookmark.objects.filter(user=request.user, post=obj).exists()
        return False

    def get_comments(self, obj):
        root_comments = obj.comments.filter(parent_comment__isnull=True).order_by("created_at")
        return CommentSerializer(root_comments, many=True, context=self.context).data


class NotificationSerializer(serializers.ModelSerializer):
    sender = UserSummarySerializer(read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "recipient",
            "sender",
            "notification_type",
            "post",
            "comment",
            "is_read",
            "created_at",
        ]


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSummarySerializer(read_only=True)
    receiver = UserSummarySerializer(read_only=True)

    class Meta:
        model = Message
        fields = [
            "id",
            "sender",
            "receiver",
            "content",
            "attachment",
            "is_read",
            "created_at",
        ]


class StorySerializer(serializers.ModelSerializer):
    user = UserSummarySerializer(read_only=True)

    class Meta:
        model = Story
        fields = ["id", "user", "media", "caption", "created_at", "expires_at"]
