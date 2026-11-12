import { formatRelativeTime } from "@lib/date";
import { useQueryClient } from "@tanstack/react-query";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import {
	ArrowUpRight,
	FileText,
	Flame,
	Globe,
	MessageSquare,
	PenSquare,
	RefreshCw,
	Search,
	Shield,
	Trash2,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import {
	MobileAlertSheet,
	NeoBadge,
	NeoButton,
	NeoCard,
	NeoInput,
} from "@/components/ui";
import { GuildBadge } from "@/features/guilds/components/GuildBadge";
import { isPostEdited, normalizePostTags } from "@/features/posts/api";
import { PostComposerModal } from "@/features/posts/components/PostComposerModal";
import type { Post } from "@/features/posts/types";

import { useAdminPosts, useDeleteAdminPost } from "../hooks/useAdmin";
import type { AdminPostVisibilityFilter } from "../types";

export function AdminPostDirectory() {
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [visibilityFilter, setVisibilityFilter] =
		useState<AdminPostVisibilityFilter>("all");

	const {
		data: posts,
		isLoading,
		refetch,
		isFetching,
	} = useAdminPosts(search, visibilityFilter);
	const deletePostMutation = useDeleteAdminPost();

	const [editingPost, setEditingPost] = useState<Post | null>(null);
	const [deletingPost, setDeletingPost] = useState<Post | null>(null);

	const handleConfirmDelete = async () => {
		if (!deletingPost) return;
		await deletePostMutation.mutateAsync(deletingPost.id);
		setDeletingPost(null);
	};

	return (
		<View className="gap-4">
			<NeoInput
				value={search}
				onChangeText={setSearch}
				placeholder="Search transmissions by title, author, or #tag..."
				startContent={
					<Search size={15} color="#000000" strokeWidth={2.5} />
				}
			/>

			<View className="flex-row items-center justify-between gap-2">
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={{ gap: 6 }}
					className="flex-1">
					{(
						[
							{ key: "all", label: "All Transmissions" },
							{ key: "public", label: "Public" },
							{ key: "house", label: "House-Only" },
						] as const
					).map((tab) => {
						const isActive = visibilityFilter === tab.key;
						return (
							<NeoButton
								key={tab.key}
								size="sm"
								variant={isActive ? "primary" : "outline"}
								onPress={() => setVisibilityFilter(tab.key)}>
								{tab.label}
							</NeoButton>
						);
					})}
				</ScrollView>

				<NeoButton
					size="sm"
					variant="outline"
					className="size-9 px-0"
					accessibilityLabel="Refresh transmissions list"
					onPress={() => void refetch()}>
					<RefreshCw
						size={14}
						color={isFetching ? "#ff2a00" : "#000000"}
						className={isFetching ? "animate-spin" : ""}
					/>
				</NeoButton>
			</View>

			{isLoading ? (
				<View className="gap-3">
					{[1, 2, 3].map((i) => (
						<View
							key={i}
							className="h-32 animate-pulse rounded-none border-2 border-border bg-card p-4 shadow-neo-sm"
						/>
					))}
				</View>
			) : !posts || posts.length === 0 ? (
				<NeoCard className="items-center justify-center border-dashed border-border bg-card py-12 text-center">
					<FileText size={32} color="#000000" strokeWidth={2.5} />
					<Text className="mt-3 font-display text-base tracking-tight text-foreground uppercase">
						No Transmissions Found
					</Text>
					<Text className="mt-1 text-center font-mono text-xs text-muted-foreground">
						Try adjusting your search keywords or visibility
						filters.
					</Text>
				</NeoCard>
			) : (
				<View className="gap-3">
					{posts.map((post) => {
						const score =
							(post.upvotes_count || 0) -
							(post.downvotes_count || 0);
						const edited = isPostEdited(post);
						const tags = normalizePostTags(post.tags);
						const authorName =
							post.author?.display_name ||
							post.author?.username ||
							"Student";

						return (
							<NeoCard
								key={post.id}
								className="gap-3 border-border bg-card p-4">
								<View className="flex-row items-center justify-between gap-2">
									<Pressable
										onPress={() => {
											if (post.author?.username) {
												router.push(
													`/u/${post.author.username}` as any,
												);
											}
										}}
										className="min-w-0 flex-1 flex-row items-center gap-2.5 active:opacity-75">
										<View className="size-9 items-center justify-center overflow-hidden rounded-none border-2 border-border bg-muted">
											{post.author?.avatar_url &&
											post.author.avatar_url.startsWith(
												"http",
											) ? (
												<ExpoImage
													source={{
														uri: post.author
															.avatar_url,
													}}
													style={{
														width: "100%",
														height: "100%",
													}}
													contentFit="cover"
												/>
											) : (
												<Text className="font-bold text-xs text-foreground">
													{authorName
														.slice(0, 2)
														.toUpperCase()}
												</Text>
											)}
										</View>
										<View className="min-w-0 flex-1">
											<Text
												numberOfLines={1}
												className="font-bold text-xs text-foreground">
												{authorName}
											</Text>
											<Text className="font-mono text-[11px] text-muted-foreground">
												@
												{post.author?.username ||
													"student"}{" "}
												•{" "}
												{formatRelativeTime(
													post.created_at,
												)}
												{edited ? " • (edited)" : ""}
											</Text>
										</View>
									</Pressable>

									<View className="flex-row items-center gap-1.5">
										{post.visibility === "house" ? (
											<NeoBadge
												variant="default"
												size="sm"
												className="border-2 border-border bg-muted"
												textClassName="text-foreground"
												startContent={
													<Shield
														size={10}
														color="#000000"
														strokeWidth={2.5}
													/>
												}>
												HOUSE
											</NeoBadge>
										) : (
											<NeoBadge
												variant="outline"
												size="sm"
												startContent={
													<Globe
														size={10}
														color="#000000"
														strokeWidth={2.5}
													/>
												}>
												PUBLIC
											</NeoBadge>
										)}
										{post.guild && (
											<GuildBadge
												guildId={post.guild}
												size="sm"
											/>
										)}
									</View>
								</View>

								<Pressable
									onPress={() =>
										router.push(`/post/${post.id}` as any)
									}
									className="active:opacity-80">
									<Text
										numberOfLines={1}
										className="font-display text-sm text-foreground">
										{post.title}
									</Text>
									<Text
										numberOfLines={2}
										className="mt-1 font-mono text-xs leading-relaxed text-muted-foreground">
										{post.content}
									</Text>
								</Pressable>

								{tags.length > 0 && (
									<View className="flex-row flex-wrap items-center gap-1">
										{tags.slice(0, 4).map((tag) => (
											<View
												key={tag}
												className="rounded-none border border-border bg-card px-1.5 py-0.5">
												<Text className="font-bold text-[10px] text-foreground">
													{tag}
												</Text>
											</View>
										))}
									</View>
								)}

								<View className="flex-row items-center justify-between border-t border-border/40 pt-2.5">
									<View className="flex-row items-center gap-3">
										<View className="flex-row items-center gap-1">
											<Flame
												size={12}
												color="#ff2a00"
												strokeWidth={2.2}
											/>
											<Text className="font-bold text-xs text-foreground tabular-nums">
												{score}
											</Text>
										</View>
										<View className="flex-row items-center gap-1">
											<MessageSquare
												size={12}
												color="#000000"
												strokeWidth={2.2}
											/>
											<Text className="font-mono text-xs text-muted-foreground tabular-nums">
												{post.comments_count}
											</Text>
										</View>
									</View>

									<View className="flex-row items-center gap-1.5">
										<NeoButton
											size="sm"
											variant="outline"
											startContent={
												<ArrowUpRight
													size={12}
													color="#000000"
													strokeWidth={2.4}
												/>
											}
											onPress={() =>
												router.push(
													`/post/${post.id}` as any,
												)
											}></NeoButton>
										<NeoButton
											size="sm"
											variant="outline"
											startContent={
												<PenSquare
													size={12}
													color="#000000"
													strokeWidth={2.4}
												/>
											}
											onPress={() =>
												setEditingPost(post)
											}></NeoButton>
										<NeoButton
											size="sm"
											variant="destructive"
											startContent={
												<Trash2
													size={12}
													color="#ffffff"
													strokeWidth={2.4}
												/>
											}
											textClassName="text-primary-foreground font-bold"
											onPress={() =>
												setDeletingPost(post)
											}></NeoButton>
									</View>
								</View>
							</NeoCard>
						);
					})}
				</View>
			)}

			<PostComposerModal
				open={Boolean(editingPost)}
				onOpenChange={(open) => {
					if (!open) setEditingPost(null);
				}}
				editingPost={editingPost}
				onPostUpdated={() => {
					setEditingPost(null);
					void queryClient.invalidateQueries({
						queryKey: ["admin"],
					});
				}}
			/>

			<MobileAlertSheet
				open={Boolean(deletingPost)}
				onOpenChange={(open) => {
					if (!open) setDeletingPost(null);
				}}
				title="Delete Post"
				type="error"
				description={`Are you sure you want to permanently delete "${deletingPost?.title || "this transmission"}" by @${deletingPost?.author?.username || "student"}?`}
				actions={[
					{
						label: "Delete Permanently",
						onPress: handleConfirmDelete,
						variant: "destructive",
						loading: deletePostMutation.isPending,
					},
					{
						label: "Cancel",
						onPress: () => setDeletingPost(null),
						variant: "outline",
					},
				]}
			/>
		</View>
	);
}
