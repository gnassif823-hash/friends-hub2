# 🚀 How to Deploy Friends Hub

To share this app with your friends so they can access it from their phones/computers, follow these steps. We will use **Vercel** (free and easiest for React apps).

## 1. Prerequisites
- A **GitHub Account**.
- A **Vercel Account** (log in with GitHub).
- Your **Supabase Project** (you already have this).

## 2. Push Code to GitHub
1. Create a new repository on GitHub (e.g., `friends-hub`).
2. Run these commands in your project terminal:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/friends-hub.git
   git push -u origin main
   ```

## 3. Deploy on Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **"Add New..."** -> **Project**.
3. Import your `friends-hub` repository.
4. **IMPORTANT**: In the "Environment Variables" section, add:
   - `VITE_SUPABASE_URL`: (Your Supabase URL)
   - `VITE_SUPABASE_ANON_KEY`: (Your Supabase Anon Key)
5. Click **Deploy**.

## 4. Final Supabase Setup (Critical!)
For the **Photo Gallery** to work, you must create a Storage Bucket:
1. Go to your Supabase Dashboard -> **Storage**.
2. Create a new bucket named **`gallery`**.
3. Toggle: **"Public Bucket"** (ON).
4. Save.

## 5. Security Note ⚠️
Your app uses "Simple Auth" (Username only).
- **Pros**: Zero friction. Friends just type their name.
- **Cons**: Anyone who guesses a name can login as that person.
- **Recommendation**: Since this involves a URL you share privately, it's usually fine for a close group. If you post the link publicly on Twitter/Facebook, strangers *will* troll you.

## 6. Access
Once Vercel finishes, they will give you a link (e.g., `https://friends-hub-xyz.vercel.app`). Send this to your group!
