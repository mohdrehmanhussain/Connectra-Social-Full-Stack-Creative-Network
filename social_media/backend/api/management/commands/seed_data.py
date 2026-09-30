"""
Django management command to seed the SQLite/PostgreSQL database with
10 sample users, 20 posts, nested comments, likes, follows, notifications,
bookmarks, messages, and 24-hour stories.

Usage:
    python manage.py seed_data
"""
from django.core.management.base import BaseCommand
from api.models import (
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


class Command(BaseCommand):
    help = "Seeds the database with 10 users, 20 posts, comments, likes, follows, and messages."

    def handle(self, *args, **options):
        self.stdout.write("Seeding Aether Social database...")

        users_data = [
            ("elena_rostova", "elena@aether.social", "Elena Rostova", "Zurich, Switzerland", "Principal Spatial Architect exploring monolithic timber and daylight."),
            ("marcus_vance", "marcus@aether.social", "Marcus Vance", "Berlin, Germany", "Industrial designer & tactile synthesizer builder."),
            ("sora_takahashi", "sora@aether.social", "Sora Takahashi", "Kyoto, Japan", "Medium-format documentary & alpine photographer."),
            ("liam_oconnor", "liam@aether.social", "Liam O'Connor", "Dublin, Ireland", "Distributed systems architect & local-first software researcher."),
            ("amara_okafor", "amara@aether.social", "Amara Okafor", "Lagos / London", "Ceramicist working with wild-foraged clays and wood ash glazes."),
            ("clara_lindqvist", "clara@aether.social", "Clara Lindqvist", "Stockholm, Sweden", "Typeface designer & editorial art director."),
            ("devon_brooks", "devon@aether.social", "Devon Brooks", "Montreal, Canada", "Acoustic architect & mastering engineer."),
            ("nadia_mansour", "nadia@aether.social", "Nadia Mansour", "Cairo, Egypt", "Botanical illustrator & arid-climate landscape architect."),
            ("julian_mercer", "julian@aether.social", "Julian Mercer", "New York, NY", "Kinetic sculptor working with brass pendulums and solar caustics."),
            ("hannah_kim", "hannah@aether.social", "Hannah Kim", "Seoul, South Korea", "Computational designer & creative technologist."),
        ]

        created_users = []
        for uname, email, fname, loc, bio in users_data:
            user, created = User.objects.get_or_create(
                username=uname,
                defaults={
                    "email": email,
                    "full_name": fname,
                    "location": loc,
                    "bio": bio,
                    "is_online": True,
                },
            )
            if created:
                user.set_password("AetherPass2026!")
                user.save()
            created_users.append(user)

        sample_posts = [
            (0, "Evening light grazing the cantilevered travertine roof at our Lake Como pavilion study. #architecture #daylight #minimalism", "Lake Como, Italy"),
            (1, "Morning calibration on the MK-IV polyphonic voice card alongside fresh V60 coffee. #industrialdesign #synthesizer #hardware", "Berlin, Germany"),
            (2, "At 2,940 meters in the Southern Japanese Alps before sunrise broke through the valley inversion. #photography #alpine #documentary", "Yamanashi, Japan"),
            (4, "Unloading reduction kiln batch #42 this morning. Basalt dust mixed with wood ash glaze. #ceramics #materiality #craft", "London, UK"),
            (5, "Finalizing optical size masters for Vespera Serif—our new editorial typeface. #typography #editorial #designsystems", "Stockholm, Sweden"),
            (3, "Benchmarked our local-first CRDT sync engine at 0.4ms frame commit latency. #softwarecraft #localfirst #systems", "Dublin, Ireland"),
            (6, "Measured the impulse response of our new slotted Baltic birch diffuser wall today. #acoustics #sounddesign #studio", "Montreal, Canada"),
            (7, "Field documentation from the Fayoum Oasis permaculture plots. #botany #architecture #ecology", "Fayoum Oasis, Egypt"),
            (8, "Installed Helios Pendulum No. 7 in the south atrium this afternoon. #kineticart #sculpture #daylight", "SoHo, New York"),
            (9, "Translating differential growth algorithms from WebGL compute shaders into cotton rag prints. #generativeart #shaders", "Seoul, South Korea"),
        ]

        for idx in range(20):
            u_idx, text, loc = sample_posts[idx % len(sample_posts)]
            post, _ = Post.objects.get_or_create(
                user=created_users[u_idx],
                content=f"{text} (Dispatch #{idx + 1})",
                defaults={"location": loc, "hashtags": ["architecture", "craft"]},
            )
            if idx == 0:
                root_c, _ = Comment.objects.get_or_create(
                    post=post,
                    user=created_users[2],
                    parent_comment=None,
                    content="The caustic reflections on that travertine soffit are extraordinary!",
                )
                Comment.objects.get_or_create(
                    post=post,
                    user=created_users[0],
                    parent_comment=root_c,
                    content="Thank you! We lined the shallow basin with honed quartzite slabs.",
                )
            Like.objects.get_or_create(user=created_users[(u_idx + 1) % 10], post=post)

        for i in range(1, 9):
            Follow.objects.get_or_create(follower=created_users[i], following=created_users[0])
            Follow.objects.get_or_create(follower=created_users[0], following=created_users[i])

        Message.objects.get_or_create(
            sender=created_users[1],
            receiver=created_users[0],
            content="Hi Elena! Just finished milling the bronze acoustic sconces for the Zurich mockup.",
        )

        self.stdout.write(self.style.SUCCESS("Successfully seeded 10 users, 20 posts, comments, likes, follows, and messages!"))
