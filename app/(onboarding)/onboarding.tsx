import { Text, View } from "react-native";

export default function OnboardingScreen() {
	return (
		<View className="flex-1 items-center justify-center bg-slate-950 px-6">
			<View className="w-full max-w-sm rounded-2xl border border-sky-500/50 bg-slate-900 p-6 shadow-lg">
				<Text className="text-2xl font-bold text-white">Uniwind test</Text>
				<Text className="mt-2 text-base text-slate-300">
					If the card is styled, Tailwind/Uniwind is working.
				</Text>

				<View className="mt-5 flex-row">
					<View className="mr-3 flex-1 rounded-xl bg-sky-500 px-4 py-3">
						<Text className="text-center font-semibold text-white">OK</Text>
					</View>
					<View className="flex-1 rounded-xl border border-emerald-400 bg-emerald-500/10 px-4 py-3">
						<Text className="text-center font-semibold text-emerald-300">
							PASS
						</Text>
					</View>
				</View>
			</View>
		</View>
	);
}
