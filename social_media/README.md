# Connectra Social — Full-Stack Social Media Platform

A modern, responsive, full-stack **Social Media Platform** engineered with **Django + Django REST Framework** (Backend), **SQLite / PostgreSQL-ready** relational models (Database), and a responsive **HTML5, CSS3, and Vanilla JavaScript (Fetch API)** frontend interface.

---

## 1. Project Structure

```text
social_media/
│
├── backend/
│   ├── manage.py
│   ├── social_media/
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── api/
│       ├── __init__.py
│       ├── models.py          # User, Post, Comment, Like, CommentLike, Follow, Notification, Bookmark, Message, Story
│       ├── serializers.py     # Nested DRF serializers with validation & computed counts
│       ├── views.py           # REST API views, Auth, Permissions, Search, Feed, Messaging
│       ├── urls.py            # Clean REST API routing
│       └── management/
│           └── commands/
│               └── seed_data.py  # Populates 10 users, 20 posts, comments, likes, follows, messages, stories
│
├── frontend/
│   ├── index.html             # Home Feed, Stories, Post Composer, Right Sidebar
│   ├── login.html             # Login & Forgot Password UI
│   ├── register.html          # User Registration with Profile Picture & Validation
│   ├── profile.html           # User Profile (Posts, Media, Liked Posts, Edit Profile Modal)
│   ├── explore.html           # Explore Grid, Trending Hashtags, Popular Users, Search
│   ├── notifications.html     # Real-time Notifications with Read/Unread State
│   ├── messages.html          # Direct Messaging Interface with Online Status & Attachments
│   ├── settings.html          # Account, Security, Privacy, and Theme Settings
│   ├── css/
│   │   └── style.css          # Custom Design System, Dark/Light Theme Variables, Responsive Grid
│   └── js/
│       └── app.js             # Fetch API Client, State Management, DOM Hydration, Toast System
│
├── media/                     # Uploaded profile avatars, cover banners, post media, stories
├── static/                    # Static assets
├── requirements.txt           # Python dependencies
└── README.md                  # Documentation, Setup, Migration & Demo Credentials
```

---

## 2. Sample Login Credentials (Demo Accounts)

The platform comes pre-seeded with **10 users**, **20 posts**, **nested comments/replies**, **likes**, **followers**, **notifications**, **stories**, and **messages**:

| Full Name | Username | Email | Password | Role / Bio Focus |
| :--- | :--- | :--- | :--- | :--- |
| **Elena Rostova** | `elena_rostova` | `elena@aether.social` | `AetherPass2026!` | Principal Spatial Architect · Zurich |
| **Marcus Vance** | `marcus_vance` | `marcus@aether.social` | `AetherPass2026!` | Industrial Designer & Synthesizer Builder · Berlin |
| **Sora Takahashi** | `sora_takahashi` | `sora@aether.social` | `AetherPass2026!` | Documentary & Alpine Photographer · Kyoto |
| **Liam O'Connor** | `liam_oconnor` | `liam@aether.social` | `AetherPass2026!` | Distributed Systems Engineer · Dublin |
| **Amara Okafor** | `amara_okafor` | `amara@aether.social` | `AetherPass2026!` | Ceramicist & Material Researcher · Lagos / London |
| **Clara Lindqvist** | `clara_lindqvist` | `clara@aether.social` | `AetherPass2026!` | Typographer & Editorial Director · Stockholm |
| **Devon Brooks** | `devon_brooks` | `devon@aether.social` | `AetherPass2026!` | Acoustic & Mastering Engineer · Montreal |
| **Nadia Mansour** | `nadia_mansour` | `nadia@aether.social` | `AetherPass2026!` | Botanical Illustrator & Permaculture Designer · Cairo |
| **Julian Mercer** | `julian_mercer` | `julian@aether.social` | `AetherPass2026!` | Kinetic Sculpture & Light Artist · New York |
| **Hannah Kim** | `hannah_kim` | `hannah@aether.social` | `AetherPass2026!` | Computational Designer & Creative Technologist · Seoul |

---

## 3. Setup, Database Migration & Run Instructions

### Step 1: Create Virtual Environment & Install Dependencies

```bash
cd social_media
python3 -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Step 2: Run Database Migrations

```bash
cd backend
python manage.py makemigrations api
python manage.py migrate
```

### Step 3: Seed Sample Demonstration Data

```bash
python manage.py seed_data
```

### Step 4: Start the Development Server

```bash
python manage.py runserver 0.0.0.0:8000
```

### Migrating from SQLite to PostgreSQL / MySQL

In `backend/social_media/settings.py`, set the `DATABASE_ENGINE` environment variable (or update `DATABASES['default']`):

```bash
export DB_ENGINE=django.db.backends.postgresql
export DB_NAME=aether_social
export DB_USER=postgres
export DB_PASSWORD=your_password
export DB_HOST=localhost
export DB_PORT=5432
python manage.py migrate
```

---

## 4. REST API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/register/` | Register a new user with validation & avatar |
| `POST` | `/api/login/` | Authenticate via username/email & password, returns token & user |
| `POST` | `/api/logout/` | Invalidate current session/token |
| `GET` | `/api/users/` | List users, suggested accounts, and online status |
| `GET` | `/api/users/<id>/` | Retrieve detailed user profile, stats, and relationship state |
| `PUT` | `/api/profile/` | Update authenticated user profile, avatar, cover image, bio |
| `GET` | `/api/posts/` | List feed, explore, user, liked, or hashtag-filtered posts |
| `POST` | `/api/posts/` | Create post with text, multiple images, hashtags, mentions, location |
| `PUT` | `/api/posts/<id>/` | Edit post (author only) |
| `DELETE` | `/api/posts/<id>/` | Delete post (author only) |
| `POST` | `/api/posts/<id>/like/` | Toggle post like & generate notification |
| `POST` | `/api/posts/<id>/comment/` | Add root comment or nested reply (`parent_comment`) |
| `PUT` | `/api/comments/<id>/` | Edit comment (author only) |
| `DELETE` | `/api/comments/<id>/` | Delete comment (author only) |
| `POST` | `/api/comments/<id>/like/` | Toggle like on a comment or reply |
| `POST` | `/api/users/<id>/follow/` | Follow a user & trigger notification |
| `POST` | `/api/users/<id>/unfollow/` | Unfollow a user |
| `GET` | `/api/notifications/` | List user notifications + unread count |
| `POST` | `/api/notifications/mark-all-read/` | Mark all notifications as read |
| `GET` | `/api/messages/` | List conversations and direct message history |
| `POST` | `/api/messages/` | Send a direct message with text, emoji, or image |
| `POST` | `/api/bookmarks/` | Toggle saved/bookmarked post |
| `GET` | `/api/stories/` | List active 24-hour user stories |
| `POST` | `/api/stories/` | Publish a new 24-hour story |
| `GET` | `/api/search/?q=<query>` | Real-time search across users, posts, and hashtags |
