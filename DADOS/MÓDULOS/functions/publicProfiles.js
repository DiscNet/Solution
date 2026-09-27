const axios = require("axios");

const HTTP_TIMEOUT = 20000;
const INSTAGRAM_WEB_APP_ID = "936619743392459";

function cleanUsername(value) {
  return String(value || "")
    .trim()
    .replace(/^@+/, "")
    .replace(/^https?:\/\/(?:www\.)?instagram\.com\//i, "")
    .split(/[/?#]/)[0]
    .trim();
}

function compactNumber(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("pt-BR", {
    notation: n >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(n);
}

function fullNumber(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("pt-BR").format(n);
}

function datePt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Desconhecida";
  return date.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

async function fetchInstagramProfile(username) {
  const user = cleanUsername(username);

  if (!/^[A-Za-z0-9._]{1,30}$/.test(user)) {
    const error = new Error("Usuário do Instagram inválido.");
    error.code = "INVALID_USERNAME";
    throw error;
  }

  const target =
    "https://www.instagram.com/api/v1/users/web_profile_info/?username=" +
    encodeURIComponent(user);

  const response = await axios.get(target, {
    timeout: HTTP_TIMEOUT,
    validateStatus: () => true,
    headers: {
      "user-agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      "x-ig-app-id": INSTAGRAM_WEB_APP_ID,
      accept: "*/*",
      "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
      referer: "https://www.instagram.com/" + encodeURIComponent(user) + "/",
    },
  });

  if (response.status === 404) {
    const error = new Error("Perfil do Instagram não encontrado.");
    error.code = "NOT_FOUND";
    throw error;
  }

  if (response.status === 401 || response.status === 403) {
    const error = new Error("O Instagram bloqueou a consulta pública temporariamente.");
    error.code = "INSTAGRAM_BLOCKED";
    error.httpStatus = response.status;
    throw error;
  }

  if (response.status === 429) {
    const error = new Error("O Instagram limitou as consultas. Tente novamente mais tarde.");
    error.code = "RATE_LIMIT";
    error.httpStatus = 429;
    throw error;
  }

  if (response.status < 200 || response.status >= 300) {
    const error = new Error("Instagram respondeu HTTP " + response.status + ".");
    error.httpStatus = response.status;
    throw error;
  }

  const data = response.data?.data?.user;
  if (!data || typeof data !== "object") {
    const error = new Error("Não foi possível interpretar os dados públicos do perfil.");
    error.code = "INVALID_RESPONSE";
    throw error;
  }

  return {
    source: "Instagram",
    username: String(data.username || user),
    fullName: String(data.full_name || ""),
    biography: String(data.biography || ""),
    followers: Number(data.edge_followed_by?.count || 0),
    following: Number(data.edge_follow?.count || 0),
    posts: Number(data.edge_owner_to_timeline_media?.count || 0),
    private: Boolean(data.is_private),
    verified: Boolean(data.is_verified),
    business: Boolean(data.is_business_account),
    professional: Boolean(data.is_professional_account),
    category: String(data.category_name || data.business_category_name || ""),
    externalUrl: String(data.external_url || ""),
    avatar: String(data.profile_pic_url_hd || data.profile_pic_url || ""),
    profileUrl: "https://www.instagram.com/" + encodeURIComponent(data.username || user) + "/",
  };
}

async function fetchRobloxJson(method, url, body) {
  const response = await axios({
    method,
    url,
    data: body,
    timeout: HTTP_TIMEOUT,
    validateStatus: () => true,
    headers: {
      "user-agent": "WhatsAppBot/1.0",
      accept: "application/json",
      "content-type": "application/json",
    },
  });

  if (response.status === 404) {
    const error = new Error("Usuário do Roblox não encontrado.");
    error.code = "NOT_FOUND";
    throw error;
  }

  if (response.status === 429) {
    const error = new Error("O Roblox limitou as consultas. Tente novamente mais tarde.");
    error.code = "RATE_LIMIT";
    error.httpStatus = 429;
    throw error;
  }

  if (response.status < 200 || response.status >= 300) {
    const error = new Error("Roblox respondeu HTTP " + response.status + ".");
    error.httpStatus = response.status;
    throw error;
  }

  return response.data;
}

async function fetchRobloxProfile(username) {
  const user = String(username || "").trim().replace(/^@+/, "");

  if (!/^[A-Za-z0-9_]{3,20}$/.test(user)) {
    const error = new Error("Usuário do Roblox inválido.");
    error.code = "INVALID_USERNAME";
    throw error;
  }

  const resolved = await fetchRobloxJson(
    "post",
    "https://users.roblox.com/v1/usernames/users",
    {
      usernames: [user],
      excludeBannedUsers: false,
    },
  );

  const account = Array.isArray(resolved?.data) ? resolved.data[0] : null;
  if (!account?.id) {
    const error = new Error("Usuário do Roblox não encontrado.");
    error.code = "NOT_FOUND";
    throw error;
  }

  const id = Number(account.id);

  const [
    details,
    followers,
    following,
    friends,
    thumbnail,
  ] = await Promise.all([
    fetchRobloxJson("get", "https://users.roblox.com/v1/users/" + id),
    fetchRobloxJson("get", "https://friends.roblox.com/v1/users/" + id + "/followers/count"),
    fetchRobloxJson("get", "https://friends.roblox.com/v1/users/" + id + "/followings/count"),
    fetchRobloxJson("get", "https://friends.roblox.com/v1/users/" + id + "/friends/count"),
    fetchRobloxJson(
      "get",
      "https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=" +
        id +
        "&size=420x420&format=Png&isCircular=false",
    ),
  ]);

  const thumb = Array.isArray(thumbnail?.data) ? thumbnail.data[0] : null;

  return {
    source: "Roblox",
    id,
    username: String(details?.name || account.name || user),
    displayName: String(details?.displayName || account.displayName || ""),
    description: String(details?.description || ""),
    created: String(details?.created || ""),
    banned: Boolean(details?.isBanned),
    verified: Boolean(details?.hasVerifiedBadge),
    followers: Number(followers?.count || 0),
    following: Number(following?.count || 0),
    friends: Number(friends?.count || 0),
    avatar: String(thumb?.imageUrl || ""),
    profileUrl: "https://www.roblox.com/users/" + id + "/profile",
  };
}

module.exports = {
  cleanUsername,
  compactNumber,
  fullNumber,
  datePt,
  fetchInstagramProfile,
  fetchRobloxProfile,
};
