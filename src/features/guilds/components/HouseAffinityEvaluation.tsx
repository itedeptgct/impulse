import { ArrowLeft, ArrowRight, Check } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import type { GuildId } from "../types";

interface HouseEvaluationOption {
	guild: GuildId;
	label: string;
}

interface HouseEvaluationQuestion {
	prompt: string;
	options: HouseEvaluationOption[];
}

interface HouseAffinityEvaluationProps {
	isSubmitting: boolean;
	onComplete: (guild: GuildId) => void;
}

const QUESTIONS: HouseEvaluationQuestion[] = [
	{
		prompt: "Which kind of project sounds most exciting?",
		options: [
			{
				guild: "octagram",
				label: "Building an app or solving a tech problem",
			},
			{
				guild: "chameleon",
				label: "Creating a visual identity or artwork",
			},
			{
				guild: "blue_jays",
				label: "Sharing a story or covering an event",
			},
		],
	},
	{
		prompt: "What role do you naturally take in a team?",
		options: [
			{ guild: "octagram", label: "I figure out how to make it work" },
			{ guild: "chameleon", label: "I shape how it looks and feels" },
			{
				guild: "blue_jays",
				label: "I connect people and communicate the plan",
			},
		],
	},
	{
		prompt: "Which challenge would you choose?",
		options: [
			{ guild: "octagram", label: "Debugging a tricky technical issue" },
			{
				guild: "chameleon",
				label: "Designing a standout graphic or 3D piece",
			},
			{
				guild: "blue_jays",
				label: "Producing an interview or campus feature",
			},
		],
	},
	{
		prompt: "Which result feels most rewarding?",
		options: [
			{ guild: "octagram", label: "A tool that works and helps people" },
			{
				guild: "chameleon",
				label: "A design that catches everyone's eye",
			},
			{
				guild: "blue_jays",
				label: "A story that brings people together",
			},
		],
	},
	{
		prompt: "What would you most like to learn next?",
		options: [
			{
				guild: "octagram",
				label: "Programming, hardware, or networking",
			},
			{ guild: "chameleon", label: "Graphic design, typography, or 3D" },
			{
				guild: "blue_jays",
				label: "Journalism, video, or content creation",
			},
		],
	},
];

const GUILD_NAMES: Record<GuildId, string> = {
	octagram: "Octagram",
	chameleon: "Chameleon",
	blue_jays: "Blue Jays",
};

function recommendGuild(answers: GuildId[]): GuildId {
	const scores: Record<GuildId, number> = {
		octagram: 0,
		chameleon: 0,
		blue_jays: 0,
	};

	for (const answer of answers) {
		scores[answer] += 1;
	}

	const highScore = Math.max(...Object.values(scores));
	const leaders = (Object.keys(scores) as GuildId[]).filter(
		(guild) => scores[guild] === highScore,
	);
	const finalAnswer = answers[answers.length - 1];

	return leaders.includes(finalAnswer) ? finalAnswer : leaders[0];
}

export function HouseAffinityEvaluation({
	isSubmitting,
	onComplete,
}: HouseAffinityEvaluationProps) {
	const [questionIndex, setQuestionIndex] = useState(0);
	const [answers, setAnswers] = useState<Array<GuildId | null>>(() =>
		Array(QUESTIONS.length).fill(null),
	);

	const question = QUESTIONS[questionIndex];
	const selectedGuild = answers[questionIndex];
	const isLastQuestion = questionIndex === QUESTIONS.length - 1;

	const selectAnswer = (guild: GuildId) => {
		setAnswers((current) =>
			current.map((answer, index) =>
				index === questionIndex ? guild : answer,
			),
		);
	};

	const goToNext = () => {
		if (!selectedGuild || isSubmitting) return;
		if (!isLastQuestion) {
			setQuestionIndex((current) => current + 1);
			return;
		}

		const completedAnswers = answers.map((answer, index) =>
			index === questionIndex ? selectedGuild : answer,
		);
		const resolvedAnswers: GuildId[] = [];
		for (const answer of completedAnswers) {
			if (answer === null) return;
			resolvedAnswers.push(answer);
		}
		onComplete(recommendGuild(resolvedAnswers));
	};

	return (
		<View className="flex-1 items-center justify-center px-4 py-6">
			<View
				style={{ width: "100%", maxWidth: 760 }}
				className="border-2 border-border bg-card p-5 shadow-neo">
				<View className="mb-5 flex-row items-start justify-between gap-4">
					<View className="flex-1">
						<Text className="font-display text-2xl tracking-tight text-foreground uppercase">
							FIND YOUR HOUSE
						</Text>
						<Text className="mt-1 font-mono text-xs leading-relaxed text-muted-foreground">
							Answer five quick questions. We’ll match your
							interests with the house that fits you best.
						</Text>
					</View>
					<Text className="font-bold font-mono text-xs tracking-wider text-foreground">
						{String(questionIndex + 1).padStart(2, "0")} / 05
					</Text>
				</View>

				<View className="mb-5 h-2 border border-border bg-background">
					<View
						className="h-full bg-neo-green"
						style={{
							width: `${((questionIndex + 1) / QUESTIONS.length) * 100}%`,
						}}
					/>
				</View>

				<Text className="mb-3 font-display text-lg text-foreground">
					{question.prompt}
				</Text>

				<View className="gap-2">
					{question.options.map((option) => {
						const isSelected = selectedGuild === option.guild;
						return (
							<Pressable
								key={option.guild}
								accessibilityRole="radio"
								accessibilityState={{
									checked: isSelected,
									disabled: isSubmitting,
								}}
								disabled={isSubmitting}
								onPress={() => selectAnswer(option.guild)}
								className={`min-h-14 flex-row items-center justify-between gap-3 border-2 border-border px-4 py-3 ${
									isSelected
										? "bg-neo-green shadow-neo-sm"
										: "bg-surface"
								}`}>
								<View className="min-w-0 flex-1">
									<Text
										className={`font-bold text-[10px] tracking-wider uppercase ${
											isSelected
												? "text-foreground"
												: "text-muted-foreground"
										}`}>
										{GUILD_NAMES[option.guild]}
									</Text>
									<Text className="mt-0.5 font-mono text-xs text-foreground">
										{option.label}
									</Text>
								</View>
								{isSelected && (
									<Check
										size={18}
										color="#000000"
										strokeWidth={2.5}
									/>
								)}
							</Pressable>
						);
					})}
				</View>

				<View className="mt-5 flex-row items-center justify-between gap-3 border-t-2 border-border pt-4">
					<Pressable
						accessibilityRole="button"
						disabled={questionIndex === 0 || isSubmitting}
						onPress={() =>
							setQuestionIndex((current) => current - 1)
						}
						className={`min-h-10 flex-row items-center gap-2 border-2 border-border px-3 ${
							questionIndex === 0
								? "bg-background opacity-50"
								: "bg-surface"
						}`}>
						<ArrowLeft size={14} color="#000000" />
						<Text className="font-bold text-xs text-foreground uppercase">
							BACK
						</Text>
					</Pressable>

					<Pressable
						accessibilityRole="button"
						disabled={!selectedGuild || isSubmitting}
						onPress={goToNext}
						className={`min-h-10 flex-row items-center gap-2 border-2 border-border px-4 shadow-neo-sm ${
							selectedGuild && !isSubmitting
								? "bg-primary"
								: "bg-background opacity-50"
						}`}>
						<Text className="font-bold text-xs text-primary-foreground uppercase">
							{isSubmitting
								? "ASSIGNING..."
								: isLastQuestion
									? "REVEAL MY HOUSE"
									: "NEXT"}
						</Text>
						<ArrowRight size={14} color="#FFFFFF" />
					</Pressable>
				</View>
			</View>
		</View>
	);
}
