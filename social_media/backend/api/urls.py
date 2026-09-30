"""
API URL Configuration for Aether Social Media Platform.
"""
from django.urls import path
from .views import (
    BookmarkToggleAPIView,
    LoginAPIView,
    LogoutAPIView,
    MessagesAPIView,
    NotificationsAPIView,
    PostCommentCreateAPIView,
    PostDetailAPIView,
    PostLikeToggleAPIView,
    PostListCreateAPIView,
    ProfileUpdateAPIView,
    RegisterAPIView,
    StoriesAPIView,
    UserDetailAPIView,
    UserFollowAPIView,
    UsersListAPIView,
    UserUnfollowAPIView,
)

urlpatterns = [
    path("register/", RegisterAPIView.as_view(), name="api-register"),
    path("login/", LoginAPIView.as_view(), name="api-login"),
    path("logout/", LogoutAPIView.as_view(), name="api-logout"),
    path("users/", UsersListAPIView.as_view(), name="api-users"),
    path("users/<int:pk>/", UserDetailAPIView.as_view(), name="api-user-detail"),
    path("profile/", ProfileUpdateAPIView.as_view(), name="api-profile-update"),
    path("posts/", PostListCreateAPIView.as_view(), name="api-posts"),
    path("posts/<int:pk>/", PostDetailAPIView.as_view(), name="api-post-detail"),
    path("posts/<int:pk>/like/", PostLikeToggleAPIView.as_view(), name="api-post-like"),
    path("posts/<int:pk>/comment/", PostCommentCreateAPIView.as_view(), name="api-post-comment"),
    path("users/<int:pk>/follow/", UserFollowAPIView.as_view(), name="api-user-follow"),
    path("users/<int:pk>/unfollow/", UserUnfollowAPIView.as_view(), name="api-user-unfollow"),
    path("notifications/", NotificationsAPIView.as_view(), name="api-notifications"),
    path("messages/", MessagesAPIView.as_view(), name="api-messages"),
    path("bookmarks/", BookmarkToggleAPIView.as_view(), name="api-bookmarks"),
    path("stories/", StoriesAPIView.as_view(), name="api-stories"),
]
