# 📺 OdyseeFeed

Facebook-style social feed app jo aapke Odysee channel ke saath integrate hota hai.

## ✨ Features

- ✅ **Auto-registration** on app load (naam daalke shuru karo)
- ✅ **Top comment pinned** as a glowing "🏆 BEST COMMENT" band **media ke UPAR**
- ✅ **Odysee channel integration** via secure backend proxy (API key kabhi frontend ko nahi milti)
- ✅ Odysee videos thumbnail + click to open on Odysee
- ✅ Local posts (text, image, video upload)
- ✅ Comments with like-based sorting
- ✅ Dark mode, share, filter, search-ready

## 🚀 Setup (3 steps)

### 1. Install dependencies
```bash
cd odyseefeed
npm install
```

### 2. Configure your Odysee channel
```bash
cp .env.example .env
```

Then edit `.env`:
```env
PORT=3000
ODYSEE_CLAIM_ID=@YourChannelName:1
ODYSEE_API_KEY=your_api_key_here_optional
```

**Claim ID kaise milega:**
1. Apne Odysee channel pe jao
2. URL dekho: `https://odysee.com/@MyChannel:1`
3. Claim ID = `@MyChannel:1` (yeh paste karo)

**API key (optional):**
- https://odysee.com/settings/api pe jao
- API key banao aur `.env` mein paste karo
- Bina API key ke bhi kaam karega (lower rate limits)

### 3. Start the server
```bash
npm start
```

Open: **http://localhost:3000**

## 🔒 Security Note

- API key sirf **server-side** `.env` mein stored hai
- Frontend (`public/index.html`) ko API key kabhi nahi milti
- Odysee API calls backend proxy ke through hoti hain
- User data (registration) `localStorage` mein hai (client-side only)

## 📁 Project Structure

```
odyseefeed/
├── server.js              # Backend proxy (Odysee API calls)
├── package.json
├── .env.example           # Environment template
├── .gitignore
└── public/
    └── index.html         # Frontend (auto-registered user, feed, etc.)
```

## 🎨 UI Features

- Top comment → glowing gold "BEST COMMENT" band, always above image/video
- Odysee videos → thumbnail + play button + "odysee" watermark
- Channel sidebar → live stats (videos, views, followers)
- Auto-registration modal on first visit
- Mobile-responsive

## 🐛 Troubleshooting

**Problem:** "Odysee API से कनेक्ट नहीं हो सका"
- Server chal raha hai? Check: `npm start` karke dekho
- Browser console mein errors check karo

**Problem:** "अभी कोई वीडियो नहीं मिला"
- `.env` mein `ODYSEE_CLAIM_ID` sahi hai?
- Channel pe videos published hain?

**Problem:** API key issue
- `.env` mein API key double-check karo
- Optional hai - bina API key ke bhi kaam karega

## 🌐 Production Deployment

For production, deploy on:
- **Heroku** / **Render** / **Railway** - easy Node.js hosting
- **VPS** with PM2
- **Docker** container

Set environment variables in your hosting platform's dashboard.
