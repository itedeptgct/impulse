import { Check, Circle } from "lucide-react-native";
import { Text, View } from "react-native";

import {
	checkPasswordRequirements,
	type PasswordRequirements,
} from "../utils/password-rules";

interface PasswordRequirementsListProps {
	password: string;
}

interface RequirementItemProps {
	satisfied: boolean;
	label: string;
}

function RequirementItem({ satisfied, label }: RequirementItemProps) {
	return (
		<View className="flex-row items-center gap-2 py-0.5">
			{satisfied ? (
				<View className="size-4 items-center justify-center rounded-sm border border-primary bg-primary/20">
					<Check size={11} color="#91e6b1" strokeWidth={3} />
				</View>
			) : (
				<View className="size-4 items-center justify-center rounded-sm border border-border bg-card">
					<Circle size={8} color="#6c7284" strokeWidth={2} />
				</View>
			)}
			<Text
				className={`font-mono text-xs ${
					satisfied ? "text-primary" : "text-muted-foreground"
				}`}>
				{label}
			</Text>
		</View>
	);
}

export function PasswordRequirementsList({
	password,
}: PasswordRequirementsListProps) {
	const reqs: PasswordRequirements = checkPasswordRequirements(password);

	return (
		<View className="rounded-sm border-2 border-border bg-card/60 p-3 shadow-neo-sm">
			<Text className="mb-1.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
				SECURITY REQUIREMENTS
			</Text>
			<View className="gap-1">
				<RequirementItem
					satisfied={reqs.hasMinLength}
					label="At least 8 characters"
				/>
				<RequirementItem
					satisfied={reqs.hasLetter}
					label="At least one letter (a-z, A-Z)"
				/>
				<RequirementItem
					satisfied={reqs.hasNumber}
					label="At least one number (0-9)"
				/>
				<RequirementItem
					satisfied={reqs.hasSpecial}
					label="At least one special character (!@#$%...)"
				/>
			</View>
		</View>
	);
}
