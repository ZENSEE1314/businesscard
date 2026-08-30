import type { Locale } from "./config";

// UI string dictionary. Each key maps to a translation per locale. Missing
// translations fall back to English. Keep keys stable; add new ones as screens
// are localized.
export const dict: Record<string, Record<Locale, string>> = {
  // Navigation — user menu
  "nav.home": { en: "Home", zh: "主页", id: "Beranda" },
  "nav.hub": { en: "Hub", zh: "社区", id: "Hub" },
  "nav.matches": { en: "Matches", zh: "匹配", id: "Kecocokan" },
  "nav.events": { en: "Events", zh: "活动", id: "Acara" },
  "nav.contacts": { en: "Contacts", zh: "联系人", id: "Kontak" },
  "nav.card": { en: "Digital Name Card", zh: "电子名片", id: "Kartu Nama Digital" },
  "nav.refer": { en: "Refer & Earn", zh: "推荐赚积分", id: "Referal & Hadiah" },
  "nav.marketplace": { en: "Marketplace", zh: "市场", id: "Marketplace" },
  "nav.rewards": { en: "Rewards", zh: "奖励", id: "Hadiah" },
  "nav.messages": { en: "Messages", zh: "消息", id: "Pesan" },
  "nav.membership": { en: "Membership", zh: "会员", id: "Keanggotaan" },
  "nav.awards": { en: "Awards & Events", zh: "奖项与活动", id: "Penghargaan & Acara" },
  "nav.profile": { en: "Profile", zh: "个人资料", id: "Profil" },
  "nav.accountSettings": { en: "Account Settings", zh: "账户设置", id: "Pengaturan Akun" },
  "nav.settings": { en: "Settings", zh: "设置", id: "Pengaturan" },
  "nav.pointHistory": { en: "Point History", zh: "积分记录", id: "Riwayat Poin" },
  "nav.administration": { en: "Administration", zh: "管理", id: "Administrasi" },

  // Common controls
  "common.menu": { en: "Menu", zh: "菜单", id: "Menu" },
  "common.more": { en: "More", zh: "更多", id: "Lainnya" },
  "common.chat": { en: "Chat", zh: "聊天", id: "Obrolan" },
  "common.logout": { en: "Log Out", zh: "退出登录", id: "Keluar" },
  "common.loggingOut": { en: "Logging out…", zh: "正在退出…", id: "Sedang keluar…" },
  "common.points": { en: "pts", zh: "积分", id: "poin" },
  "common.save": { en: "Save", zh: "保存", id: "Simpan" },
  "common.cancel": { en: "Cancel", zh: "取消", id: "Batal" },

  // Theme / language
  "settings.title": { en: "Settings", zh: "设置", id: "Pengaturan" },
  "settings.appLanguage": { en: "App language", zh: "应用语言", id: "Bahasa aplikasi" },
  "settings.appLanguageHint": {
    en: "Changes the language of the whole app on this device.",
    zh: "更改此设备上整个应用的语言。",
    id: "Mengubah bahasa seluruh aplikasi di perangkat ini.",
  },
  "settings.theme": { en: "Appearance", zh: "外观", id: "Tampilan" },
  "settings.themeHint": {
    en: "Choose light, dark, or follow your device.",
    zh: "选择浅色、深色，或跟随设备设置。",
    id: "Pilih terang, gelap, atau ikuti perangkat.",
  },

  // Auth
  "auth.welcomeBack": { en: "Welcome back", zh: "欢迎回来", id: "Selamat datang kembali" },
  "auth.loginSubtitle": { en: "Log in to your account.", zh: "登录您的账户。", id: "Masuk ke akun Anda." },
  "auth.email": { en: "Email", zh: "电子邮箱", id: "Email" },
  "auth.password": { en: "Password", zh: "密码", id: "Kata sandi" },
  "auth.forgot": { en: "Forgot password?", zh: "忘记密码？", id: "Lupa kata sandi?" },
  "auth.rememberMe": { en: "Remember me on this device", zh: "在此设备上记住我", id: "Ingat saya di perangkat ini" },
  "auth.login": { en: "Log in", zh: "登录", id: "Masuk" },
  "auth.loggingIn": { en: "Logging in…", zh: "正在登录…", id: "Sedang masuk…" },
  "auth.noAccount": { en: "No account?", zh: "还没有账户？", id: "Belum punya akun?" },
  "auth.createOne": { en: "Create one", zh: "创建账户", id: "Buat akun" },
  "auth.createAccount": { en: "Create your account", zh: "创建您的账户", id: "Buat akun Anda" },
  "auth.registerSubtitle": {
    en: "Free forever. Your digital name card is created instantly.",
    zh: "永久免费。您的电子名片将立即创建。",
    id: "Gratis selamanya. Kartu nama digital Anda dibuat secara instan.",
  },

  // Dashboard
  "dash.goodMorning": { en: "Good morning", zh: "早上好", id: "Selamat pagi" },
  "dash.goodAfternoon": { en: "Good afternoon", zh: "下午好", id: "Selamat siang" },
  "dash.goodEvening": { en: "Good evening", zh: "晚上好", id: "Selamat malam" },
  "dash.points": { en: "Points", zh: "积分", id: "Poin" },
  "dash.contacts": { en: "Contacts", zh: "联系人", id: "Kontak" },
  "dash.checkinStreak": { en: "Check-in streak", zh: "连续签到", id: "Rentetan check-in" },
  "dash.newMessages": { en: "New messages", zh: "新消息", id: "Pesan baru" },
  "dash.quickActions": { en: "Quick actions", zh: "快捷操作", id: "Aksi cepat" },
  "dash.recommended": {
    en: "Recommended for what you’re looking for",
    zh: "根据您的需求推荐",
    id: "Rekomendasi untuk yang Anda cari",
  },
  "dash.recentConnections": { en: "Recent connections", zh: "最近的联系人", id: "Koneksi terbaru" },
  "dash.followUps": { en: "Follow-ups due", zh: "待跟进", id: "Tindak lanjut" },
  "dash.networkGrowth": { en: "Your network growth", zh: "您的人脉增长", id: "Pertumbuhan jaringan Anda" },
  "dash.upcomingEvents": { en: "Upcoming events", zh: "即将举行的活动", id: "Acara mendatang" },

  // Landing
  "landing.login": { en: "Log in", zh: "登录", id: "Masuk" },
  "landing.getStarted": { en: "Get started", zh: "开始使用", id: "Mulai" },
  "landing.heroBadge": { en: "Your business, one tap away", zh: "您的事业，一触即达", id: "Bisnis Anda, satu ketukan saja" },
  "landing.heroTitlePrefix": { en: "Your next opportunity could be", zh: "您的下一个机会", id: "Peluang berikutnya bisa" },
  "landing.heroTitleHighlight": { en: "one connection away", zh: "也许就在一个人脉之间", id: "hanya satu koneksi lagi" },
  "landing.heroSubtitle": {
    en: "Build your professional profile, discover trusted businesses, connect directly and earn rewards — all in one friendly app.",
    zh: "建立您的专业档案，发现值得信赖的商家，直接联系并赚取奖励 — 尽在一个友好的应用中。",
    id: "Bangun profil profesional, temukan bisnis tepercaya, terhubung langsung, dan raih hadiah — semua dalam satu aplikasi.",
  },
  "landing.createFreeProfile": { en: "Create my free profile", zh: "创建我的免费档案", id: "Buat profil gratis saya" },
  "landing.exploreMemberClub": { en: "Explore Member Club", zh: "探索会员俱乐部", id: "Jelajahi Member Club" },

  // WhatsApp community + follow-up
  "community.join": { en: "Join our WhatsApp community", zh: "加入我们的 WhatsApp 社区", id: "Gabung komunitas WhatsApp kami" },
};
