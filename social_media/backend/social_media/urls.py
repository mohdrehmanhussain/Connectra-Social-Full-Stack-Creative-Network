"""
Root URL configuration for social_media project.
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.views.generic import TemplateView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
    path("", TemplateView.as_view(template_name="index.html"), name="home"),
    path("login/", TemplateView.as_view(template_name="login.html"), name="login"),
    path("register/", TemplateView.as_view(template_name="register.html"), name="register"),
    path("profile/", TemplateView.as_view(template_name="profile.html"), name="profile"),
    path("explore/", TemplateView.as_view(template_name="explore.html"), name="explore"),
    path("notifications/", TemplateView.as_view(template_name="notifications.html"), name="notifications"),
    path("messages/", TemplateView.as_view(template_name="messages.html"), name="messages"),
    path("settings/", TemplateView.as_view(template_name="settings.html"), name="settings"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])
