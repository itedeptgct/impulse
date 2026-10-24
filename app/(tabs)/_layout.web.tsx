import { signOut } from "@auth/api";
import { useAuthStore } from "@auth/store";
import { Image } from "expo-image";
import { Redirect, Slot, router, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
	ArrowRight,
	CheckCircle2,
	Flame,
	Hash,
	LogOut,
	Plus,
	ShieldCheck,
	Sparkles,
	Trophy,
	User,
	Users,
} from "lucide-react-native";
import { Button, Dialog, Text } from "panelui-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { GuildSelectionModal } from "@/features/guilds/components/GuildSelectionModal";
import { GUILD_LIST } from "@/features/guilds/constants";
import { PostComposerModal } from "@/features/posts/components/PostComposerModal";

export default function TabsWebLayout() {
	const session = useAuthStore((state) => state.session);
	const isLoading = useAuthStore((state) => state.isLoading);
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);
	const verification = useAuthStore((state) => state.verification);
	const clearSession = useAuthStore((state) => state.clearSession);

	const pathname = usePathname();

	const [isComposerOpen, setIsComposerOpen] = useState(false);
	const [isGuildModalOpen, setIsGuildModalOpen] = useState(false);
	const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
	const [isSigningOut, setIsSigningOut] = useState(false);

	if (isLoading) {
		return (
			<View className="min-h-screen flex-1 items-center justify-center bg-background">
				<ActivityIndicator color="#10b981" size="large" />
			</View>
		);
	}

	if (!session) {
		return <Redirect href="/(onboarding)/onboarding" />;
	}

	const handleSignOut = async () => {
		setIsSigningOut(true);
		try {
			await signOut();
			clearSession();
			setIsSignOutDialogOpen(false);
			router.replace("/(onboarding)/onboarding");
		} finally {
			setIsSigningOut(false);
		}
	};

	const currentUsername = profile?.username || "me";
	const displayName =
		profile?.display_name ||
		profile?.username ||
		user?.user_metadata?.full_name ||
		user?.email?.split("@")[0] ||
		"Student";
	const initials = displayName.slice(0, 2).toUpperCase();
	const isAdmin = profile?.role === "admin";
	const isApproved = verification?.status === "approved";

	const isFeedActive =
		pathname === "/" || pathname === "/(tabs)" || pathname === "/(tabs)/";
	const isGuildsActive = pathname.includes("/guilds");
	const isMyProfileActive =
		pathname.includes(`/u/${currentUsername}`) ||
		pathname === "/(tabs)/profile" ||
		pathname === "/profile";

	const activeStudents = [
		{
			name: "Sarah Tan",
			username: "sarahtan",
			guild: "Chameleon",
			initials: "ST",
			bg: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
		},
		{
			name: "Alex Rivera",
			username: "alex",
			guild: "Octagram",
			initials: "AR",
			bg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
		},
		{
			name: "Marcus Roy",
			username: "marcus_dev",
			guild: "Blue Jays",
			initials: "MR",
			bg: "bg-sky-500/20 text-sky-400 border-sky-500/30",
		},
		{
			name: "Elena Vance",
			username: "elena_k",
			guild: "Octagram",
			initials: "EV",
			bg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
		},
	];

	return (
		<View className="min-h-screen flex-1 bg-background text-foreground">
			<StatusBar style="light" />

			{/* Responsive Top Bar for Mobile & Tablet (< md) */}
			<header className="sticky top-0 z-40 flex flex-row items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md md:hidden">
				<Pressable
					onPress={() => router.push("/(tabs)")}
					className="flex-row items-center gap-2">
					<Text
						weight="bold"
						className="text-lg tracking-wider text-primary lowercase">
						impulse
					</Text>
				</Pressable>
				<View className="flex-row items-center gap-1.5">
					<Pressable
						onPress={() => router.push("/(tabs)")}
						className={`rounded-xl p-2 ${isFeedActive ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>
						<Flame
							size={18}
							color={isFeedActive ? "#10b981" : "#a1a1aa"}
						/>
					</Pressable>
					<Pressable
						onPress={() => router.push("/(tabs)/guilds")}
						className={`rounded-xl p-2 ${isGuildsActive ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>
						<Users
							size={18}
							color={isGuildsActive ? "#10b981" : "#a1a1aa"}
						/>
					</Pressable>
					<Pressable
						onPress={() =>
							router.push(`/(tabs)/u/${currentUsername}`)
						}
						className={`rounded-xl p-2 ${isMyProfileActive ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>
						<User
							size={18}
							color={isMyProfileActive ? "#10b981" : "#a1a1aa"}
						/>
					</Pressable>
					<Pressable
						onPress={() => setIsSignOutDialogOpen(true)}
						className="rounded-xl p-2 text-muted-foreground">
						<LogOut size={18} color="#a1a1aa" />
					</Pressable>
				</View>
			</header>

			{/* Main 3-Column Responsive Shell */}
			<View className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 md:px-8">
				<View className="grid grid-cols-1 gap-6 md:grid-cols-12">
					{/* Left Column (3 cols): Persistent Navigation & Identity Sidebar */}
					<aside className="hidden space-y-4 md:col-span-3 md:block">
						<View className="sticky top-6 space-y-4">
							{/* Brand Logo & Tag */}
							<View className="rounded-2xl border border-border bg-card p-4 shadow-sm">
								<View className="flex-row items-center justify-between border-b border-border/60 pb-3">
									<Pressable
										onPress={() => router.push("/(tabs)")}
										className="flex-row items-center gap-2">
										<Text
											weight="bold"
											className="text-xl tracking-wider text-primary lowercase">
											impulse
										</Text>
									</Pressable>
									<View className="rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5">
										<Text
											weight="bold"
											className="text-[10px] text-primary">
											NETWORK
										</Text>
									</View>
								</View>

								{/* Navigation Links */}
								<View className="mt-3 space-y-1.5">
									<Pressable
										onPress={() => router.push("/(tabs)")}
										className={`flex-row items-center gap-3 rounded-xl px-3 py-2.5 transition-all active:scale-[0.98] ${
											isFeedActive
												? "border border-primary/25 bg-primary/10"
												: "hover:bg-muted/50"
										}`}>
										<Flame
											size={18}
											color={
												isFeedActive
													? "#10b981"
													: "#a1a1aa"
											}
										/>
										<Text
											weight={
												isFeedActive ? "bold" : "medium"
											}
											className={`text-xs ${isFeedActive ? "text-primary" : "text-muted-foreground"}`}>
											Feed Stream
										</Text>
									</Pressable>

									<Pressable
										onPress={() =>
											router.push("/(tabs)/guilds")
										}
										className={`flex-row items-center gap-3 rounded-xl px-3 py-2.5 transition-all active:scale-[0.98] ${
											isGuildsActive
												? "border border-primary/25 bg-primary/10"
												: "hover:bg-muted/50"
										}`}>
										<Users
											size={18}
											color={
												isGuildsActive
													? "#10b981"
													: "#a1a1aa"
											}
										/>
										<Text
											weight={
												isGuildsActive
													? "bold"
													: "medium"
											}
											className={`text-xs ${isGuildsActive ? "text-primary" : "text-muted-foreground"}`}>
											Faction Guilds
										</Text>
									</Pressable>

									<Pressable
										onPress={() =>
											router.push(
												`/(tabs)/u/${currentUsername}`,
											)
										}
										className={`flex-row items-center gap-3 rounded-xl px-3 py-2.5 transition-all active:scale-[0.98] ${
											isMyProfileActive
												? "border border-primary/25 bg-primary/10"
												: "hover:bg-muted/50"
										}`}>
										<User
											size={18}
											color={
												isMyProfileActive
													? "#10b981"
													: "#a1a1aa"
											}
										/>
										<Text
											weight={
												isMyProfileActive
													? "bold"
													: "medium"
											}
											className={`text-xs ${isMyProfileActive ? "text-primary" : "text-muted-foreground"}`}>
											My Profile
										</Text>
									</Pressable>

									{isAdmin && (
										<Pressable
											onPress={() =>
												router.push("/(admin)")
											}
											className="flex-row items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-muted/50 active:scale-[0.98]">
											<ShieldCheck
												size={18}
												color="#10b981"
											/>
											<Text
												weight="medium"
												className="text-xs text-primary">
												Admin Moderation
											</Text>
										</Pressable>
									)}
								</View>

								{/* Primary New Post Action */}
								<Button
									size="md"
									variant="primary"
									className="mt-4 w-full active:scale-[0.98]"
									startContent={
										<Plus size={16} color="#ffffff" />
									}
									onPress={() => setIsComposerOpen(true)}>
									New Post
								</Button>
							</View>

							{/* User Identity & Quick Profile Mini-Card */}
							<View className="rounded-2xl border border-border bg-card p-4 shadow-sm">
								<Pressable
									onPress={() =>
										router.push(
											`/(tabs)/u/${currentUsername}`,
										)
									}
									className="flex-row items-center gap-3 transition-opacity active:opacity-80">
									<View className="h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
										<Text
											weight="bold"
											className="text-sm text-primary">
											{initials}
										</Text>
									</View>
									<View className="min-w-0 flex-1">
										<View className="flex-row items-center gap-1.5">
											<Text
												weight="bold"
												className="text-xs text-foreground"
												numberOfLines={1}>
												{displayName}
											</Text>
											{isApproved && (
												<CheckCircle2
													size={13}
													color="#10b981"
												/>
											)}
										</View>
										<Text
											className="text-[11px] text-muted-foreground"
											numberOfLines={1}>
											@{profile?.username || "student"}
											{profile?.guild
												? ` • ${profile.guild}`
												: ""}
										</Text>
									</View>
								</Pressable>

								<View className="mt-3.5 flex-row items-center gap-2 border-t border-border/60 pt-3">
									<Button
										size="sm"
										variant="outline"
										className="flex-1"
										onPress={() =>
											router.push(
												`/(tabs)/u/${currentUsername}`,
											)
										}>
										View Profile
									</Button>
									<Button
										size="sm"
										variant="ghost"
										className="h-8 w-8 rounded-lg"
										onPress={() =>
											setIsSignOutDialogOpen(true)
										}>
										<LogOut size={14} color="#a1a1aa" />
									</Button>
								</View>
							</View>
						</View>
					</aside>

					{/* Center Column (6 cols on lg, 9 cols on md, 12 cols on mobile): Route Outlet */}
					<main className="col-span-12 mx-auto w-full max-w-2xl md:col-span-9 lg:col-span-6">
						<Slot />
					</main>

					{/* Right Column (3 cols): Faction Standings & Campus Discovery */}
					<aside className="hidden space-y-4 lg:col-span-3 lg:block">
						<View className="sticky top-6 space-y-4">
							{/* Faction Standings Widget */}
							<View className="rounded-2xl border border-border bg-card p-4 shadow-sm">
								<View className="flex-row items-center justify-between border-b border-border/60 pb-3">
									<View className="flex-row items-center gap-2">
										<Trophy size={14} color="#10b981" />
										<Text
											weight="bold"
											className="text-xs tracking-wider text-muted-foreground uppercase">
											Faction Standings
										</Text>
									</View>
									<Pressable
										onPress={() =>
											router.push("/(tabs)/guilds")
										}
										className="flex-row items-center gap-1">
										<Text
											weight="semibold"
											className="text-[11px] text-primary hover:underline">
											All Guilds
										</Text>
										<ArrowRight size={11} color="#10b981" />
									</Pressable>
								</View>

								<View className="mt-3 space-y-2">
									{GUILD_LIST.map((guild, index) => (
										<Pressable
											key={guild.id}
											onPress={() =>
												router.push("/(tabs)/guilds")
											}
											className="flex-row items-center justify-between rounded-xl border border-border/70 bg-muted/30 p-2.5 transition-all hover:bg-muted/60 active:scale-[0.98]">
											<View className="flex-row items-center gap-2.5">
												<Image
													source={guild.logo}
													style={{
														width: 18,
														height: 18,
													}}
													contentFit="contain"
												/>
												<View>
													<Text
														weight="bold"
														className={`text-xs ${guild.badgeTextColor}`}>
														{index + 1}.{" "}
														{guild.name}
													</Text>
													<Text
														className="text-[10px] text-muted-foreground"
														numberOfLines={1}>
														{guild.tagline}
													</Text>
												</View>
											</View>
											<View className="rounded-md bg-muted/60 px-2 py-0.5">
												<Text
													weight="bold"
													className="text-[10px] text-foreground">
													{index === 0
														? "1,420 pts"
														: index === 1
															? "1,180 pts"
															: "890 pts"}
												</Text>
											</View>
										</Pressable>
									))}
								</View>
							</View>

							{/* Active Students Spotlight Widget */}
							<View className="rounded-2xl border border-border bg-card p-4 shadow-sm">
								<View className="flex-row items-center gap-2 border-b border-border/60 pb-3">
									<Sparkles size={14} color="#10b981" />
									<Text
										weight="bold"
										className="text-xs tracking-wider text-muted-foreground uppercase">
										Active Students
									</Text>
								</View>

								<View className="mt-3 space-y-2.5">
									{activeStudents.map((student) => (
										<View
											key={student.username}
											className="flex-row items-center justify-between">
											<Pressable
												onPress={() =>
													router.push(
														`/(tabs)/u/${student.username}`,
													)
												}
												className="min-w-0 flex-1 flex-row items-center gap-2.5">
												<View
													className={`h-7 w-7 items-center justify-center rounded-lg border font-bold text-[11px] ${student.bg}`}>
													<Text
														weight="bold"
														className="text-[10px] text-foreground">
														{student.initials}
													</Text>
												</View>
												<View className="min-w-0 flex-1">
													<Text
														weight="semibold"
														className="text-xs text-foreground hover:underline"
														numberOfLines={1}>
														{student.name}
													</Text>
													<Text
														className="text-[10px] text-muted-foreground"
														numberOfLines={1}>
														@{student.username} •{" "}
														{student.guild}
													</Text>
												</View>
											</Pressable>

											<Button
												size="sm"
												variant="outline"
												className="ml-2 h-7 rounded-lg px-2.5"
												onPress={() =>
													router.push(
														`/(tabs)/u/${student.username}`,
													)
												}>
												View
											</Button>
										</View>
									))}
								</View>
							</View>

							{/* Trending Campus Topics */}
							<View className="rounded-2xl border border-border bg-card p-4 shadow-sm">
								<View className="flex-row items-center gap-2 border-b border-border/60 pb-3">
									<Hash size={14} color="#a1a1aa" />
									<Text
										weight="bold"
										className="text-xs tracking-wider text-muted-foreground uppercase">
										Trending Topics
									</Text>
								</View>
								<View className="mt-3 flex-row flex-wrap gap-1.5">
									{[
										"#algorithms",
										"#reactnative",
										"#rust",
										"#cybersecurity",
										"#systemdesign",
										"#webdev",
									].map((tag) => (
										<View
											key={tag}
											className="rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1">
											<Text className="text-[11px] text-muted-foreground">
												{tag}
											</Text>
										</View>
									))}
								</View>
							</View>
						</View>
					</aside>
				</View>
			</View>

			{/* Global Post Composer Modal */}
			<PostComposerModal
				open={isComposerOpen}
				onOpenChange={setIsComposerOpen}
				onPostCreated={(newPost) => {
					if (typeof window !== "undefined") {
						window.dispatchEvent(
							new CustomEvent("impulse-post-created", {
								detail: newPost,
							}),
						);
					}
				}}
				onOpenGuildModal={() => setIsGuildModalOpen(true)}
			/>

			{/* Guild Selection Induction Modal */}
			<GuildSelectionModal
				open={isGuildModalOpen}
				onOpenChange={setIsGuildModalOpen}
				canDismiss={true}
			/>

			{/* Sign Out Confirmation Dialog */}
			<Dialog
				open={isSignOutDialogOpen}
				onOpenChange={setIsSignOutDialogOpen}>
				<Dialog.Content className="mx-4 max-w-sm rounded-2xl border border-border bg-card p-6">
					<Dialog.Title
						weight="bold"
						className="text-xl text-foreground">
						Sign Out
					</Dialog.Title>
					<Dialog.Description className="mt-2 text-sm text-muted-foreground">
						Are you sure you want to sign out of your Impulse
						account?
					</Dialog.Description>
					<Dialog.Footer className="mt-6 flex-row gap-2.5">
						<Button
							size="md"
							variant="outline"
							className="flex-1"
							onPress={() => setIsSignOutDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							size="md"
							variant="destructive"
							className="flex-1"
							loading={isSigningOut}
							onPress={handleSignOut}>
							Sign Out
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>
		</View>
	);
}
