/**
 * Aether Social — Vanilla JS + Fetch API Client (frontend/js/app.js)
 * Connects the HTML5/CSS3 frontend templates to the Django REST Framework API.
 */
const API_BASE = "/api";

class AetherAPI {
  static getToken() {
    return localStorage.getItem("aether_auth_token") || "";
  }

  static getHeaders() {
    const headers = { "Content-Type": "application/json" };
    const token = this.getToken();
    if (token) headers["Authorization"] = `Token ${token}`;
    return headers;
  }

  static async request(endpoint, options = {}) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { ...this.getHeaders(), ...(options.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || data.detail || "API request failed");
    }
    return data;
  }

  static login(username, password) {
    return this.request("/login/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }

  static register(payload) {
    return this.request("/register/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  static getPosts(params = "") {
    return this.request(`/posts/${params}`);
  }

  static createPost(payload) {
    return this.request("/posts/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  static toggleLike(postId) {
    return this.request(`/posts/${postId}/like/`, { method: "POST" });
  }

  static addComment(postId, content, parent_comment = null) {
    return this.request(`/posts/${postId}/comment/`, {
      method: "POST",
      body: JSON.stringify({ content, parent_comment }),
    });
  }

  static toggleFollow(userId, isFollowing) {
    const action = isFollowing ? "unfollow" : "follow";
    return this.request(`/users/${userId}/${action}/`, { method: "POST" });
  }

  static toggleBookmark(postId) {
    return this.request("/bookmarks/", {
      method: "POST",
      body: JSON.stringify({ post_id: postId }),
    });
  }
}

window.AetherAPI = AetherAPI;
