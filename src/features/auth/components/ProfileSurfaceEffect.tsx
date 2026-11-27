import { LinearGradient } from "expo-linear-gradient";
import { memo, useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withRepeat,
	withTiming,
} from "react-native-reanimated";

import type { GuildId } from "@/features/guilds/types";

interface ProfileSurfaceEffectProps {
	guild?: GuildId | null;
	height?: number;
}

const CODE_COLUMNS = [
	{
		glyphs: ["0", "x", "A", "1", "F", "0", "9", "C"],
		duration: 2900,
		delay: 0,
		opacity: 0.9,
	},
	{
		glyphs: ["1", "0", "E", "7", "B", "1", "0", "4"],
		duration: 3600,
		delay: 420,
		opacity: 0.55,
	},
	{
		glyphs: ["/", "/", "0", "1", "D", "8", "A", "0"],
		duration: 2500,
		delay: 850,
		opacity: 0.85,
	},
	{
		glyphs: ["{", "1", "0", "F", "3", "C", "1", "}"],
		duration: 3900,
		delay: 200,
		opacity: 0.45,
	},
	{
		glyphs: ["0", "1", "9", "A", "E", "0", "F", "1"],
		duration: 2700,
		delay: 1100,
		opacity: 0.95,
	},
	{
		glyphs: ["<", "0", "x", "7", "1", "B", "0", ">"],
		duration: 3400,
		delay: 600,
		opacity: 0.6,
	},
	{
		glyphs: ["F", "0", "1", "C", "4", "A", "1", "0"],
		duration: 3100,
		delay: 150,
		opacity: 0.8,
	},
	{
		glyphs: ["1", "A", "0", "1", "E", "9", "0", "1"],
		duration: 2600,
		delay: 980,
		opacity: 0.7,
	},
	{
		glyphs: ["0", "x", "F", "0", "1", "8", "D", "1"],
		duration: 3800,
		delay: 320,
		opacity: 0.5,
	},
	{
		glyphs: ["[", "1", "0", "A", "C", "1", "0", "]"],
		duration: 2800,
		delay: 740,
		opacity: 0.9,
	},
	{
		glyphs: ["E", "1", "0", "7", "F", "0", "1", "A"],
		duration: 3300,
		delay: 1200,
		opacity: 0.6,
	},
	{
		glyphs: ["0", "1", "B", "4", "0", "x", "1", "9"],
		duration: 2450,
		delay: 500,
		opacity: 0.85,
	},
	{
		glyphs: ["1", "C", "0", "9", "1", "A", "0", "F"],
		duration: 3700,
		delay: 180,
		opacity: 0.5,
	},
	{
		glyphs: ["0", "1", "D", "0", "F", "1", "8", "0"],
		duration: 3000,
		delay: 900,
		opacity: 0.75,
	},
	{
		glyphs: ["_", "0", "x", "1", "E", "0", "1", "B"],
		duration: 2650,
		delay: 400,
		opacity: 0.9,
	},
	{
		glyphs: ["A", "1", "0", "F", "0", "1", "C", "7"],
		duration: 3500,
		delay: 1050,
		opacity: 0.55,
	},
];

function CodeRainColumn({
	glyphs,
	duration,
	delay,
	opacity,
	accentColor,
	headColor,
	height,
}: {
	glyphs: string[];
	duration: number;
	delay: number;
	opacity: number;
	accentColor: string;
	headColor: string;
	height: number;
}) {
	const travel = height + 96;
	const translateY = useSharedValue(-96);

	useEffect(() => {
		translateY.value = withDelay(
			delay,
			withRepeat(
				withTiming(travel, {
					duration,
					easing: Easing.linear,
				}),
				-1,
				false,
			),
		);
	}, [delay, duration, translateY, travel]);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: translateY.value }],
	}));

	return (
		<View className="flex-1 items-center overflow-hidden">
			<Animated.View style={[animatedStyle, { opacity }]}>
				{glyphs.map((char, idx) => {
					const isHead = idx === glyphs.length - 1;
					const charOpacity = isHead
						? 1
						: 0.18 + (idx / glyphs.length) * 0.7;
					return (
						<Text
							key={idx}
							style={{
								color: isHead ? headColor : accentColor,
								opacity: charOpacity,
							}}
							className="font-code text-[10px] leading-[13px]">
							{char}
						</Text>
					);
				})}
			</Animated.View>
		</View>
	);
}

const WAVE_BARS = [
	{ min: 0.18, max: 0.72, duration: 1100, delay: 0 },
	{ min: 0.25, max: 0.9, duration: 920, delay: 120 },
	{ min: 0.14, max: 0.62, duration: 1350, delay: 240 },
	{ min: 0.3, max: 0.95, duration: 860, delay: 80 },
	{ min: 0.2, max: 0.78, duration: 1180, delay: 300 },
	{ min: 0.15, max: 0.58, duration: 1420, delay: 160 },
	{ min: 0.28, max: 0.88, duration: 980, delay: 400 },
	{ min: 0.22, max: 0.82, duration: 1080, delay: 200 },
	{ min: 0.16, max: 0.68, duration: 1260, delay: 350 },
	{ min: 0.32, max: 0.96, duration: 890, delay: 60 },
	{ min: 0.2, max: 0.74, duration: 1140, delay: 280 },
	{ min: 0.15, max: 0.6, duration: 1380, delay: 190 },
	{ min: 0.26, max: 0.86, duration: 960, delay: 420 },
	{ min: 0.18, max: 0.7, duration: 1220, delay: 110 },
	{ min: 0.24, max: 0.9, duration: 940, delay: 310 },
	{ min: 0.16, max: 0.64, duration: 1300, delay: 140 },
	{ min: 0.28, max: 0.84, duration: 1020, delay: 260 },
	{ min: 0.2, max: 0.76, duration: 1160, delay: 50 },
];

function SignalBar({
	min,
	max,
	duration,
	delay,
	color,
}: {
	min: number;
	max: number;
	duration: number;
	delay: number;
	color: string;
}) {
	const scaleY = useSharedValue(min);

	useEffect(() => {
		scaleY.value = withDelay(
			delay,
			withRepeat(
				withTiming(max, {
					duration,
					easing: Easing.inOut(Easing.quad),
				}),
				-1,
				true,
			),
		);
	}, [delay, duration, max, scaleY]);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scaleY: scaleY.value }],
	}));

	return (
		<View className="flex-1 justify-end px-0.5">
			<Animated.View
				style={[
					animatedStyle,
					{
						height: "100%",
						backgroundColor: color,
						transformOrigin: "bottom",
						opacity: 0.55,
					},
				]}
			/>
		</View>
	);
}

const DOT_ROWS = 5;
const DOT_COLS = 14;
const RGB_COLORS = ["#00FF66", "#00E5FF", "#FF007A"] as const;

function PulseDot({ row, col }: { row: number; col: number }) {
	const opacity = useSharedValue(0.14);
	const color = RGB_COLORS[(row + col) % RGB_COLORS.length];
	const delay = ((row * 3 + col) % 10) * 140;
	const duration = 1100 + ((row + col * 2) % 5) * 220;

	useEffect(() => {
		opacity.value = withDelay(
			delay,
			withRepeat(
				withTiming(0.9, {
					duration,
					easing: Easing.inOut(Easing.sin),
				}),
				-1,
				true,
			),
		);
	}, [delay, duration, opacity]);

	const animatedStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
	}));

	return (
		<Animated.View
			style={[
				animatedStyle,
				{
					width: 5,
					height: 5,
					backgroundColor: color,
				},
			]}
		/>
	);
}

function ProfileSurfaceEffectComponent({
	guild,
	height = 112,
}: ProfileSurfaceEffectProps) {
	return (
		<View
			style={{ height }}
			className="relative w-full overflow-hidden bg-[#0A0A0A]"
			pointerEvents="none">
			{guild === "chameleon" ? (
				<View className="flex-1 justify-between px-3 py-3">
					{Array.from({ length: DOT_ROWS }).map((_, r) => (
						<View
							key={r}
							className="flex-row items-center justify-between">
							{Array.from({ length: DOT_COLS }).map((__, c) => (
								<PulseDot key={c} row={r} col={c} />
							))}
						</View>
					))}
				</View>
			) : guild === "blue_jays" ? (
				<View className="flex-1 flex-row items-end px-2 pt-5 pb-1">
					{WAVE_BARS.map((bar, idx) => (
						<SignalBar
							key={idx}
							min={bar.min}
							max={bar.max}
							duration={bar.duration}
							delay={bar.delay}
							color="#00E5FF"
						/>
					))}
				</View>
			) : (
				<View className="flex-1 flex-row px-1">
					{CODE_COLUMNS.map((col, idx) => (
						<CodeRainColumn
							key={idx}
							glyphs={col.glyphs}
							duration={col.duration}
							delay={col.delay}
							opacity={col.opacity}
							accentColor={
								guild === "octagram" ? "#FF2A00" : "#00FF66"
							}
							headColor={
								guild === "octagram" ? "#FFE6E0" : "#E0FFE9"
							}
							height={height}
						/>
					))}
				</View>
			)}

			<LinearGradient
				colors={[
					"rgba(10,10,10,0.45)",
					"rgba(10,10,10,0.05)",
					"rgba(10,10,10,0.82)",
				]}
				locations={[0, 0.45, 1]}
				style={{
					position: "absolute",
					top: 0,
					right: 0,
					bottom: 0,
					left: 0,
				}}
				pointerEvents="none"
			/>
		</View>
	);
}

export const ProfileSurfaceEffect = memo(ProfileSurfaceEffectComponent);
