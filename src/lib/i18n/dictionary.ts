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
  "common.back": { en: "Back", zh: "返回", id: "Kembali" },

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
  "settings.changePassword": { en: "Change password", zh: "修改密码", id: "Ubah kata sandi" },
  "settings.changePasswordHint": {
    en: "Update the password you use to log in.",
    zh: "更新您用于登录的密码。",
    id: "Perbarui kata sandi yang Anda gunakan untuk masuk.",
  },

  // Change-password page
  "pw.title": { en: "Change password", zh: "修改密码", id: "Ubah kata sandi" },
  "pw.current": { en: "Current password", zh: "当前密码", id: "Kata sandi saat ini" },
  "pw.new": { en: "New password", zh: "新密码", id: "Kata sandi baru" },
  "pw.confirm": { en: "Confirm new password", zh: "确认新密码", id: "Konfirmasi kata sandi baru" },
  "pw.save": { en: "Update password", zh: "更新密码", id: "Perbarui kata sandi" },
  "pw.saving": { en: "Updating…", zh: "正在更新…", id: "Memperbarui…" },
  "pw.success": { en: "Password updated.", zh: "密码已更新。", id: "Kata sandi diperbarui." },

  // Common actions / states (reused across pages)
  "act.save": { en: "Save", zh: "保存", id: "Simpan" },
  "act.saving": { en: "Saving…", zh: "正在保存…", id: "Menyimpan…" },
  "act.saved": { en: "Saved.", zh: "已保存。", id: "Tersimpan." },
  "act.post": { en: "Post", zh: "发布", id: "Kirim" },
  "act.posting": { en: "Posting…", zh: "正在发布…", id: "Mengirim…" },
  "act.send": { en: "Send", zh: "发送", id: "Kirim" },
  "act.edit": { en: "Edit", zh: "编辑", id: "Ubah" },
  "act.delete": { en: "Delete", zh: "删除", id: "Hapus" },
  "act.loading": { en: "Loading…", zh: "加载中…", id: "Memuat…" },
  "act.viewProfile": { en: "View profile", zh: "查看资料", id: "Lihat profil" },

  // Hub / feed
  "hub.title": { en: "Business Hub", zh: "商业社区", id: "Hub Bisnis" },
  "hub.empty": { en: "No posts yet. Be the first to share something.", zh: "还没有帖子。来发布第一条吧。", id: "Belum ada postingan. Jadilah yang pertama berbagi." },
  "hub.composerPlaceholder": { en: "Share an update, offer or opportunity…", zh: "分享动态、优惠或商机…", id: "Bagikan kabar, penawaran, atau peluang…" },
  "hub.viewComments": { en: "View all {n} comments", zh: "查看全部 {n} 条评论", id: "Lihat semua {n} komentar" },
  "hub.addComment": { en: "Add a comment…", zh: "添加评论…", id: "Tambahkan komentar…" },
  "hub.comment": { en: "Comment", zh: "评论", id: "Komentar" },
  "hub.beFirstComment": { en: "Be the first to comment.", zh: "来发表第一条评论。", id: "Jadilah yang pertama berkomentar." },
  "hub.comments": { en: "Comments ({n})", zh: "评论（{n}）", id: "Komentar ({n})" },
  "hub.loginToComment": { en: "Log in to join the conversation.", zh: "登录以参与讨论。", id: "Masuk untuk ikut berdiskusi." },
  "hub.subtitle": { en: "Connect. Exchange cards. Do business.", zh: "连接人脉，交换名片，达成合作。", id: "Terhubung. Tukar kartu. Berbisnis." },
  "hub.findMatches": { en: "Find matches", zh: "寻找匹配", id: "Cari kecocokan" },
  "hub.awards": { en: "Awards", zh: "奖项", id: "Penghargaan" },
  "hub.myCard": { en: "My card", zh: "我的名片", id: "Kartu saya" },
  "hub.checkBack": { en: "No posts yet. Check back soon.", zh: "还没有帖子，请稍后再来。", id: "Belum ada postingan. Cek lagi nanti." },

  // Rewards
  "rewards.title": { en: "Rewards", zh: "奖励", id: "Hadiah" },
  "rewards.yourPoints": { en: "Your points", zh: "您的积分", id: "Poin Anda" },
  "rewards.redeem": { en: "Redeem", zh: "兑换", id: "Tukar" },
  "rewards.redeeming": { en: "Redeeming…", zh: "正在兑换…", id: "Menukar…" },
  "rewards.notEnough": { en: "Not enough points", zh: "积分不足", id: "Poin tidak cukup" },
  "rewards.empty": { en: "No rewards available yet.", zh: "暂无可用奖励。", id: "Belum ada hadiah tersedia." },
  "rewards.points": { en: "{n} pts", zh: "{n} 积分", id: "{n} poin" },

  // Marketplace
  "market.title": { en: "Marketplace", zh: "市场", id: "Marketplace" },
  "market.empty": { en: "No listings yet.", zh: "暂无商品。", id: "Belum ada daftar." },
  "market.contactSeller": { en: "Message seller", zh: "联系卖家", id: "Hubungi penjual" },
  "market.postListing": { en: "Post a listing", zh: "发布商品", id: "Pasang daftar" },
  "market.subtitle": {
    en: "Products and services from our paid members. Browse, then message the seller directly.",
    zh: "来自付费会员的产品与服务。浏览后可直接联系卖家。",
    id: "Produk dan layanan dari anggota berbayar. Telusuri, lalu hubungi penjual.",
  },

  // Events
  "events.title": { en: "Events", zh: "活动", id: "Acara" },
  "events.empty": { en: "No upcoming events.", zh: "暂无即将举行的活动。", id: "Tidak ada acara mendatang." },
  "events.rsvp": { en: "RSVP", zh: "报名", id: "RSVP" },
  "events.attending": { en: "Attending", zh: "已报名", id: "Hadir" },
  "events.hostQuestion": { en: "Want to host your own event?", zh: "想举办自己的活动吗？", id: "Ingin mengadakan acara sendiri?" },
  "events.subtitle": {
    en: "Meet the community in person. Paid members host their own events here.",
    zh: "与社区成员面对面交流。付费会员可在此举办活动。",
    id: "Temui komunitas secara langsung. Anggota berbayar mengadakan acara di sini.",
  },

  // Membership
  "membership.title": { en: "Membership", zh: "会员", id: "Keanggotaan" },
  "membership.currentPlan": { en: "Your plan", zh: "您的方案", id: "Paket Anda" },
  "membership.upgrade": { en: "Upgrade", zh: "升级", id: "Tingkatkan" },

  // Profile view (me)
  "me.editProfile": { en: "Edit profile", zh: "编辑资料", id: "Ubah profil" },
  "me.myCard": { en: "My name card", zh: "我的名片", id: "Kartu nama saya" },
  "me.shareCard": { en: "Share card", zh: "分享名片", id: "Bagikan kartu" },
  "me.viewPublicCard": { en: "View public card", zh: "查看公开名片", id: "Lihat kartu publik" },

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

  // Dashboard body
  "dash.memberForToday": { en: "Member for today", zh: "今日加入的会员", id: "Anggota sejak hari ini" },
  "dash.memberForDays": { en: "Member for {n} days", zh: "已加入 {n} 天", id: "Anggota selama {n} hari" },
  "dash.checkedInToday": { en: "✓ Checked in today (+{n} pts)", zh: "✓ 今日已签到（+{n} 积分）", id: "✓ Sudah check-in hari ini (+{n} poin)" },
  "dash.checkinPending": { en: "Daily check-in pending", zh: "今日签到待完成", id: "Check-in harian belum dilakukan" },
  "dash.totalLoginDays": { en: "{n} total login days", zh: "累计登录 {n} 天", id: "{n} total hari login" },
  "dash.myNameCard": { en: "My name card", zh: "我的名片", id: "Kartu nama saya" },
  "dash.businessHub": { en: "Business Hub", zh: "商业社区", id: "Hub Bisnis" },
  "dash.messages": { en: "Messages", zh: "消息", id: "Pesan" },
  "dash.rewards": { en: "Rewards", zh: "奖励", id: "Hadiah" },
  "dash.recommendedHint": {
    en: "Members who can help with the things you set under “I’m looking for”.",
    zh: "能够帮助您实现“我正在寻找”目标的会员。",
    id: "Anggota yang bisa membantu hal yang Anda cari.",
  },
  "dash.noRecommendations": {
    en: "No recommendations yet — add a few items under “I’m looking for” in your profile.",
    zh: "暂无推荐 — 请在个人资料的“我正在寻找”中添加内容。",
    id: "Belum ada rekomendasi — tambahkan beberapa hal di “Saya mencari” pada profil Anda.",
  },
  "dash.canHelpWith": { en: "Can help with", zh: "可以帮助", id: "Bisa membantu" },
  "dash.sharedInterests": { en: "{n} shared interests", zh: "{n} 个共同兴趣", id: "{n} minat yang sama" },
  "dash.viewAll": { en: "View all", zh: "查看全部", id: "Lihat semua" },
  "dash.noContactsYet": {
    en: "No contacts yet. Open someone’s card and tap “Save contact”.",
    zh: "还没有联系人。打开他人的名片并点击“保存联系人”。",
    id: "Belum ada kontak. Buka kartu seseorang dan ketuk “Simpan kontak”.",
  },
  "dash.waitingDays": { en: "Waiting {n} days for a follow-up", zh: "已等待 {n} 天待跟进", id: "Menunggu {n} hari untuk tindak lanjut" },
  "dash.followUp": { en: "Follow up", zh: "跟进", id: "Tindak lanjuti" },
  "dash.allCaughtUp": { en: "You’re all caught up. 🎉", zh: "全部处理完毕。🎉", id: "Semua sudah selesai. 🎉" },
  "dash.eventsHint": { en: "Event announcements will appear here as they are scheduled.", zh: "活动公告将在安排后显示在此处。", id: "Pengumuman acara akan muncul di sini." },
  "dash.referAndEarn": { en: "Refer & earn", zh: "推荐赚积分", id: "Referal & hadiah" },
  "dash.growthZero": {
    en: "Share your card to invite your first referral and earn +100 points.",
    zh: "分享您的名片，邀请第一位推荐人并赚取 +100 积分。",
    id: "Bagikan kartu Anda untuk mengundang referal pertama dan dapatkan +100 poin.",
  },
  "dash.growthCount": { en: "{n} members joined through your link or card.", zh: "已有 {n} 位会员通过您的链接或名片加入。", id: "{n} anggota bergabung melalui tautan atau kartu Anda." },

  // Check-in card
  "checkin.title": { en: "Daily check-in", zh: "每日签到", id: "Check-in harian" },
  "checkin.claimedToday": { en: "You claimed +{n} points today.", zh: "您今天领取了 +{n} 积分。", id: "Anda mendapat +{n} poin hari ini." },
  "checkin.earnToday": { en: "Check in to earn +{n} points today.", zh: "签到即可获得 +{n} 积分。", id: "Check-in untuk mendapat +{n} poin hari ini." },
  "checkin.doneToday": { en: "Done today", zh: "今日已完成", id: "Selesai hari ini" },
  "checkin.pending": { en: "Pending", zh: "待完成", id: "Menunggu" },
  "checkin.dayStreak": { en: "{n}-day streak", zh: "连续签到 {n} 天", id: "Rentetan {n} hari" },
  "checkin.totalDays": { en: "{n} total check-in days", zh: "累计签到 {n} 天", id: "{n} total hari check-in" },
  "checkin.nextBonus": { en: "Next bonus: +{bonus} pts at day {day}", zh: "下一个奖励：第 {day} 天 +{bonus} 积分", id: "Bonus berikutnya: +{bonus} poin di hari {day}" },
  "checkin.success": { en: "Daily check-in successful — +{n} points!", zh: "签到成功 — +{n} 积分！", id: "Check-in berhasil — +{n} poin!" },
  "checkin.checkInNow": { en: "Check in now", zh: "立即签到", id: "Check-in sekarang" },
  "checkin.checkingIn": { en: "Checking in…", zh: "正在签到…", id: "Sedang check-in…" },

  // Onboarding
  "onboard.welcome": { en: "Welcome to {app}!", zh: "欢迎来到 {app}！", id: "Selamat datang di {app}!" },
  "onboard.subtitle": {
    en: "Your account is ready and your digital name card is live. Complete your profile to earn +100 points.",
    zh: "您的账户已就绪，电子名片已上线。完善资料即可获得 +100 积分。",
    id: "Akun Anda siap dan kartu nama digital Anda aktif. Lengkapi profil untuk mendapat +100 poin.",
  },
  "onboard.createCard": { en: "Create my name card", zh: "创建我的名片", id: "Buat kartu nama saya" },
  "onboard.skip": { en: "Skip for now — go to home", zh: "暂时跳过 — 前往主页", id: "Lewati dulu — ke beranda" },
  "onboard.communityHint": {
    en: "Connect with other members and never miss an update.",
    zh: "与其他会员联系，不错过任何更新。",
    id: "Terhubung dengan anggota lain dan jangan lewatkan pembaruan.",
  },

  // Contacts
  "contacts.title": { en: "Contacts", zh: "联系人", id: "Kontak" },
  "contacts.saved": { en: "{n} saved", zh: "已保存 {n} 个", id: "{n} tersimpan" },
  "contacts.searchPlaceholder": { en: "Search name, company, role…", zh: "搜索姓名、公司、职位…", id: "Cari nama, perusahaan, peran…" },
  "contacts.allSources": { en: "All sources", zh: "所有来源", id: "Semua sumber" },
  "contacts.allCategories": { en: "All categories", zh: "所有分类", id: "Semua kategori" },
  "contacts.apply": { en: "Apply", zh: "应用", id: "Terapkan" },
  "contacts.sortNewest": { en: "Newest first", zh: "最新优先", id: "Terbaru dulu" },
  "contacts.sortName": { en: "Name A–Z", zh: "按姓名 A–Z", id: "Nama A–Z" },
  "contacts.sortCompany": { en: "Company A–Z", zh: "按公司 A–Z", id: "Perusahaan A–Z" },
  "contacts.none": { en: "No contacts found", zh: "未找到联系人", id: "Tidak ada kontak" },
  "contacts.noneHint": {
    en: "Open someone’s digital card and tap “Save contact” to add them here.",
    zh: "打开他人的电子名片并点击“保存联系人”以添加。",
    id: "Buka kartu digital seseorang dan ketuk “Simpan kontak”.",
  },

  // Generic
  "generic.viewCard": { en: "Digital card", zh: "电子名片", id: "Kartu digital" },
  "generic.message": { en: "Message", zh: "发消息", id: "Pesan" },
};
