import { useAuthStore } from "@auth/store";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { Shield, Sparkles } from "lucide-react-native";
import { Button, Text } from "panelui-native";
import { useCallback, useEffect, useState } from "react";
import {
	Clipboard,
	Pressable,
	RefreshControl,
	ScrollView,
	Share,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GuildSelectionModal } from "@/features/guilds/components/GuildSelectionModal";
import { GUILD_LIST } from "@/features/guilds/constants";
import type { GuildId } from "@/features/guilds/types";
import { fetchFeedPosts } from "@/features/posts/api";
import { PostCard } from "@/features/posts/components/PostCard";
import type { Post } from "@/features/posts/types";

export default function GuildsScreen() {
	const insets = useSafeAreaInsets();
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);
	const verification = useAuthStore((state) => state.verification);

	const [activeGuildTab, setActiveGuildTab] = useState<GuildId>(
		profile?.guild || "octagram",
	);
	const [guildPosts, setGuildPosts] = useState<Post[]>([]);
	const [isLoadingPosts, setIsLoadingPosts] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isGuildModalOpen, setIsGuildModalOpen] = useState(false);

	const loadGuildPosts = useCallback(async () => {
		setIsLoadingPosts(true);
		try {
			const posts = await fetchFeedPosts(activeGuildTab, "hot", user?.id);
			setGuildPosts(posts);
		} finally {
			setIsLoadingPosts(false);
			setIsRefreshing(false);
		}
	}, [activeGuildTab, user?.id]);

	useEffect(() => {
		void loadGuildPosts();
	}, [loadGuildPosts]);

	const onRefresh = () => {
		setIsRefreshing(true);
		void loadGuildPosts();
	};

	const currentGuild =
		GUILD_LIST.find((g) => g.id === activeGuildTab) || GUILD_LIST[0];

	const handleShare = async (post: Post) => {
		const message = `Check out this Impulse post: ${post.title}`;
		try {
			if (Share && Share.share) {
				await Share.share({ message });
			} else {
				Clipboard.setString(message);
			}
		} catch {
			Clipboard.setString(message);
		}
	};

	return (
		<View className="flex-1 bg-background text-foreground">
			<StatusBar style="light" />
			<ScrollView
				contentContainerStyle={{
					paddingTop: Math.max(insets.top, 16) + 12,
					paddingBottom: Math.max(insets.bottom, 16) + 32,
				}}
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={onRefresh}
						tintColor="#10b981"
					/>
				}
				showsVerticalScrollIndicator={false}>
				<View className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
					{/* Header Bar */}
					<View className="flex-row items-center justify-between pb-6">
						<View>
							<Text
								weight="bold"
								className="text-2xl tracking-tight text-foreground">
								Campus Factions
							</Text>
							<Text className="mt-0.5 text-xs text-muted-foreground">
								Specialized guild communities of the Impulse
								network
							</Text>
						</View>

						{verification?.status === "approved" && (
							<Button
								size="sm"
								variant="outline"
								className="transition-transform active:scale-[0.96]"
								startContent={
									<Sparkles size={14} color="#10b981" />
								}
								onPress={() => setIsGuildModalOpen(true)}>
								{profile?.guild ? "Switch Guild" : "Join Guild"}
							</Button>
						)}
					</View>
					{/* Guild Tabs Row */}
					<View className="mb-6 flex-row gap-2">
						{GUILD_LIST.map((guild) => {
							const isActive = activeGuildTab === guild.id;
							const isUserGuild = profile?.guild === guild.id;
							return (
								<Pressable
									key={guild.id}
									onPress={() =>
										setActiveGuildTab(guild.id as GuildId)
									}
									className={`flex-1 rounded-2xl border p-3.5 transition-all active:scale-[0.96] ${
										isActive
											? `${guild.badgeBorderColor} ${guild.badgeBgColor} shadow-md`
											: "border-border/70 bg-card hover:bg-muted/40"
									}`}>
									<View className="flex-row items-center justify-between">
										<View className="flex-row items-center gap-2">
											<Image
												source={guild.logo}
												style={{
													width: 18,
													height: 18,
												}}
												contentFit="contain"
											/>
											<Text
												weight="bold"
												className={`text-sm ${
													isActive
														? guild.badgeTextColor
														: "text-foreground"
												}`}>
												{guild.name}
											</Text>
										</View>
										{isUserGuild && (
											<View className="rounded-full bg-primary/20 px-1.5 py-0.5">
												<Text className="font-bold text-[9px] text-primary uppercase">
													You
												</Text>
											</View>
										)}
									</View>
									<Text
										className="mt-1 line-clamp-1 text-[11px] text-muted-foreground"
										numberOfLines={1}>
										{guild.tagline}
									</Text>
								</Pressable>
							);
						})}
					</View>
					{/* Faction Spotlight Banner */}
					<View
						className={`mb-8 rounded-3xl border p-6 shadow-sm ${currentGuild.badgeBorderColor} ${currentGuild.badgeBgColor}`}>
						<View className="flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
							<View className="flex-1">
								<View className="flex-row items-center gap-2.5">
									<View className="h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-background/80 p-1">
										<Image
											source={currentGuild.logo}
											style={{ width: 24, height: 24 }}
											contentFit="contain"
										/>
									</View>
									<View>
										<Text
											weight="bold"
											className={`text-xl ${currentGuild.badgeTextColor}`}>
											{currentGuild.name} Faction
										</Text>
										<Text className="text-xs text-muted-foreground">
											{currentGuild.tagline}
										</Text>
									</View>
								</View>
								<Text className="mt-3 text-xs leading-relaxed text-foreground sm:text-sm">
									{currentGuild.manifesto}
								</Text>
								{/* Core Competencies */}
								<View className="mt-4 flex-row flex-wrap items-center gap-1.5">
									{currentGuild.skills.map((s) => (
										<View
											key={s}
											className="rounded-lg border border-border/70 bg-background/70 px-2.5 py-1">
											<Text className="text-[11px] text-muted-foreground">
												{s}
											</Text>
										</View>
									))}
								</View>
							</View>
							{profile?.guild !== currentGuild.id &&
								verification?.status === "approved" && (
									<Button
										size="md"
										variant="primary"
										className="shrink-0 active:scale-[0.96]"
										startContent={
											<Sparkles
												size={14}
												className="text-primary-foreground"
											/>
										}
										onPress={() =>
											setIsGuildModalOpen(true)
										}>
										Induct Into {currentGuild.name}
									</Button>
								)}
						</View>
					</View>
					{/* Guild Faction Stream Header */}
					<View className="mb-4 flex-row items-center justify-between">
						<Text
							weight="bold"
							className="text-base text-foreground">
							{currentGuild.name} Discussions & Projects
						</Text>
						<Text className="text-xs text-muted-foreground">
							{guildPosts.length} posts
						</Text>
					</View>
					{/* Posts Stream */}
					{isLoadingPosts ? (
						<View className="items-center justify-center py-12">
							<Text className="text-xs text-muted-foreground">
								Loading faction transmissions...
							</Text>
						</View>
					) : guildPosts.length === 0 ? (
						<View className="items-center justify-center rounded-2xl border border-border bg-card p-8">
							<Shield
								size={24}
								className="text-muted-foreground"
							/>
							<Text
								weight="medium"
								className="mt-2 text-sm text-foreground">
								No posts in {currentGuild.name} yet
							</Text>
							<Text className="mt-1 text-xs text-muted-foreground">
								Be the first to publish a technical update or
								discussion!
							</Text>
						</View>
					) : (
						<View>
							{guildPosts.map((post) => (
								<PostCard
									key={post.id}
									post={post}
									onVote={() => {}}
									onOpenComments={() => {}}
									onShare={handleShare}
								/>
							))}
						</View>
					)}
				</View>
			</ScrollView>
			<GuildSelectionModal
				open={isGuildModalOpen}
				onOpenChange={setIsGuildModalOpen}
				canDismiss
			/>
		</View>
	);
}
