"""
Database models for Aether Social Media Platform.
Includes User, Post, Comment, Like, CommentLike, Follow, Notification,
Bookmark, Message, and Story with indexes, foreign keys, and constraints.
"""
from datetime import timedelta
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


def default_story_expiry():
    return timezone.now() + timedelta(hours=24)


class User(AbstractUser):
    """
    Custom User model extending AbstractUser with profile metadata.
    Fields: id, username, email, password, full_name, profile_picture,
    cover_image, bio, location, website, is_online, created_at
    """
    email = models.EmailField(unique=True, db_index=True)
    full_name = models.CharField(max_length=120, blank=True)
    profile_picture = models.TextField(blank=True, default="")
    cover_image = models.TextField(blank=True, default="")
    bio = models.TextField(max_length=500, blank=True, default="")
    location = models.CharField(max_length=120, blank=True, default="")
    website = models.URLField(max_length=255, blank=True, default="")
    is_online = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["username"]),
            models.Index(fields=["email"]),
        ]

    def __str__(self):
        return f"@{self.username}"


class Post(models.Model):
    """
    Social media Post model supporting text, multiple media attachments,
    hashtags, mentions, and location metadata.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="posts",
        db_index=True,
    )
    content = models.TextField(max_length=2500)
    image = models.TextField(blank=True, default="")
    images = models.JSONField(default=list, blank=True)
    location = models.CharField(max_length=140, blank=True, default="")
    hashtags = models.JSONField(default=list, blank=True)
    mentions = models.JSONField(default=list, blank=True)
    shares_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"]),
            models.Index(fields=["user", "-created_at"]),
        ]

    def __str__(self):
        return f"Post #{self.pk} by @{self.user.username}"


class Comment(models.Model):
    """
    Hierarchical Comment model supporting multi-level nested replies via parent_comment.
    """
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name="comments",
        db_index=True,
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    parent_comment = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="replies",
    )
    content = models.TextField(max_length=1000)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["post", "created_at"]),
            models.Index(fields=["parent_comment", "created_at"]),
        ]

    def __str__(self):
        return f"Comment #{self.pk} by @{self.user.username} on Post #{self.post_id}"


class Like(models.Model):
    """
    Post Like model with UniqueConstraint to prevent duplicate likes.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="post_likes",
    )
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name="likes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "post"], name="unique_user_post_like")
        ]
        indexes = [
            models.Index(fields=["post", "user"]),
        ]

    def __str__(self):
        return f"@{self.user.username} liked Post #{self.post_id}"


class CommentLike(models.Model):
    """
    Comment Like model with UniqueConstraint to prevent duplicate comment likes.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="comment_likes",
    )
    comment = models.ForeignKey(
        Comment,
        on_delete=models.CASCADE,
        related_name="likes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "comment"], name="unique_user_comment_like")
        ]

    def __str__(self):
        return f"@{self.user.username} liked Comment #{self.comment_id}"


class Follow(models.Model):
    """
    User Follow relationship preventing duplicate follows and self-following.
    """
    follower = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="following_relations",
    )
    following = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="follower_relations",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["follower", "following"], name="unique_follow_relation"),
            models.CheckConstraint(
                check=~models.Q(follower=models.F("following")),
                name="prevent_self_follow",
            ),
        ]
        indexes = [
            models.Index(fields=["follower", "following"]),
            models.Index(fields=["following", "follower"]),
        ]

    def clean(self):
        if self.follower_id == self.following_id:
            raise ValidationError("Users cannot follow themselves.")

    def __str__(self):
        return f"@{self.follower.username} -> @{self.following.username}"


class Notification(models.Model):
    """
    Notification model for new follower, post like, comment, reply, and mention events.
    """
    NOTIFICATION_TYPES = [
        ("follow", "New Follower"),
        ("like", "Post Like"),
        ("comment", "New Comment"),
        ("reply", "Comment Reply"),
        ("mention", "User Mention"),
    ]

    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
        db_index=True,
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sent_notifications",
    )
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    post = models.ForeignKey(
        Post,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    comment = models.ForeignKey(
        Comment,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read", "-created_at"]),
        ]


class Bookmark(models.Model):
    """
    Saved/Bookmarked posts per user.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="bookmarks",
    )
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name="bookmarked_by",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "post"], name="unique_user_post_bookmark")
        ]


class Message(models.Model):
    """
    Direct Message between two users supporting text, emoji, and media attachment.
    """
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sent_messages",
    )
    receiver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="received_messages",
    )
    content = models.TextField(max_length=2000)
    attachment = models.TextField(blank=True, default="")
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["sender", "receiver", "created_at"]),
            models.Index(fields=["receiver", "is_read"]),
        ]


class Story(models.Model):
    """
    24-hour ephemeral user Story.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="stories",
    )
    media = models.TextField()
    caption = models.CharField(max_length=240, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    expires_at = models.DateTimeField(default=default_story_expiry, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["expires_at", "-created_at"]),
        ]
