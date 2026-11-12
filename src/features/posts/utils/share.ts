export interface PostShareInput {
  id: string;
  title: string;
  author?: {
    username?: string;
  };
}

export function generatePostSharePayload(post: PostShareInput): {
  title: string;
  message: string;
  url: string;
} {
  const url = `impulse://post/${post.id}`;
  const authorTag = post.author?.username ? ` by @${post.author.username}` : "";
  const message = `${post.title}${authorTag}\n${url}`;

  return {
    title: post.title,
    message,
    url,
  };
}

export async function sharePost(post: PostShareInput) {
  const payload = generatePostSharePayload(post);
  try {
    const { Share } = await import("react-native");
    const result = await Share.share({
      title: payload.title,
      message: payload.message,
      url: payload.url,
    });
    return result;
  } catch (error) {
    console.error("Error sharing post:", error);
    return null;
  }
}
