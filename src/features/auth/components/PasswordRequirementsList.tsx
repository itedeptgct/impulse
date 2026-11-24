import { Check, Circle } from "lucide-react-native";
import { Text, View } from "react-native";

import {
	checkPasswordRequirements,
	type PasswordRequirements,
} from "../utils/password-rules";

interface PasswordRequirementsListProps {
	password: string;
	compact?: boolean;
}

interface RequirementItemProps {
	satisfied: boolean;
	label: string;
	compact?: boolean;
}

function RequirementItem({
	satisfied,
	label,
	compact = false,
}: RequirementItemProps) {
	return (
		<View
			className={`flex-row items-center ${
				compact ? "gap-1 py-0" : "gap-2 py-0.5"
			}`}>
			{satisfied ? (
				<View
					className={`items-center justify-center rounded-none border border-border bg-primary ${
						compact ? "size-3" : "size-4"
					}`}>
					<Check
						size={compact ? 8 : 11}
						color="#ffffff"
						strokeWidth={3}
					/>
				</View>
			) : (
				<View
					className={`items-center justify-center rounded-none border border-border bg-card ${
						compact ? "size-3" : "size-4"
					}`}>
					<Circle
						size={compact ? 6 : 8}
						color="#767676"
						strokeWidth={2}
					/>
				</View>
			)}
			<Text
				className={`font-mono ${compact ? "text-[10px]" : "text-xs"} ${
					satisfied
						? "font-bold text-foreground"
						: "text-muted-foreground"
				}`}>
				{label}
			</Text>
		</View>
	);
}

export function PasswordRequirementsList({
	password,
	compact = false,
}: PasswordRequirementsListProps) {
	const reqs: PasswordRequirements = checkPasswordRequirements(password);

	return (
		<View
			className={`rounded-none border-2 border-border bg-card shadow-neo-sm ${
				compact ? "p-2" : "p-3"
			}`}>
			<Text className="mb-1.5 font-bold text-[10px] tracking-wider text-muted-foreground uppercase">
				SECURITY REQUIREMENTS
			</Text>
			<View className={compact ? "flex-row flex-wrap gap-y-1" : "gap-1"}>
				<View className={compact ? "w-1/2" : undefined}>
					<RequirementItem
						satisfied={reqs.hasMinLength}
						label="At least 8 characters"
						compact={compact}
					/>
				</View>
				<View className={compact ? "w-1/2" : undefined}>
					<RequirementItem
						satisfied={reqs.hasLetter}
						label="At least one letter (a-z, A-Z)"
						compact={compact}
					/>
				</View>
				<View className={compact ? "w-1/2" : undefined}>
					<RequirementItem
						satisfied={reqs.hasNumber}
						label="At least one number (0-9)"
						compact={compact}
					/>
				</View>
				<View className={compact ? "w-1/2" : undefined}>
					<RequirementItem
						satisfied={reqs.hasSpecial}
						label="At least one special character (!@#$%...)"
						compact={compact}
					/>
				</View>
			</View>
		</View>
	);
}
