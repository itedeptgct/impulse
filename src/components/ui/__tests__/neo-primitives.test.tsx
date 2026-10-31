import React from "react";

import { NeoBadge, type NeoBadgeVariant } from "../NeoBadge";
import {
	NeoButton,
	type NeoButtonSize,
	type NeoButtonVariant,
} from "../NeoButton";
import { NeoCard, type NeoCardVariant } from "../NeoCard";
import { NeoInput } from "../NeoInput";

export function testNeoPrimitives() {
	// 1. Verify exports exist
	if (!NeoButton) throw new Error("NeoButton export is missing");
	if (!NeoCard) throw new Error("NeoCard export is missing");
	if (!NeoBadge) throw new Error("NeoBadge export is missing");
	if (!NeoInput) throw new Error("NeoInput export is missing");

	// 2. Test NeoButton variants and sizes instantiation
	const buttonVariants: NeoButtonVariant[] = [
		"primary",
		"secondary",
		"outline",
		"destructive",
	];
	const buttonSizes: NeoButtonSize[] = ["sm", "md", "lg"];

	for (const variant of buttonVariants) {
		for (const size of buttonSizes) {
			const elem = React.createElement(
				NeoButton,
				{
					variant,
					size,
					disabled: false,
					loading: false,
					testID: `btn-${variant}-${size}`,
				},
				"CLICK ME",
			);
			if (!React.isValidElement(elem)) {
				throw new Error(
					`Failed to create valid element for NeoButton ${variant} ${size}`,
				);
			}
			if (elem.props.variant !== variant || elem.props.size !== size) {
				throw new Error(
					`Props mismatch on NeoButton ${variant} ${size}`,
				);
			}
		}
	}

	// Test loading and disabled states
	const loadingButton = React.createElement(
		NeoButton,
		{ loading: true, disabled: true },
		"LOADING",
	);
	if (!loadingButton.props.loading || !loadingButton.props.disabled) {
		throw new Error("NeoButton loading/disabled props not reflected");
	}

	// 3. Test NeoCard variants and interactive state
	const cardVariants: NeoCardVariant[] = ["default", "raised", "accent"];
	for (const variant of cardVariants) {
		const staticCard = React.createElement(
			NeoCard,
			{ variant, testID: `card-${variant}` },
			"Static Card Content",
		);
		if (!React.isValidElement(staticCard)) {
			throw new Error(
				`Failed to create NeoCard element for variant ${variant}`,
			);
		}
		if (staticCard.props.variant !== variant) {
			throw new Error(`Variant prop mismatch on NeoCard ${variant}`);
		}

		let pressed = false;
		const interactiveCard = React.createElement(
			NeoCard,
			{
				variant,
				onPress: () => {
					pressed = true;
				},
			},
			"Interactive Card",
		);
		if (typeof interactiveCard.props.onPress !== "function") {
			throw new Error("NeoCard onPress prop was not passed correctly");
		}
		interactiveCard.props.onPress({} as any);
		if (!pressed) {
			throw new Error("NeoCard onPress callback did not execute");
		}
	}

	// 4. Test NeoBadge variants and sizes
	const badgeVariants: NeoBadgeVariant[] = [
		"default",
		"primary",
		"accent",
		"outline",
	];
	for (const variant of badgeVariants) {
		const badgeSm = React.createElement(
			NeoBadge,
			{ variant, size: "sm" },
			"MINT",
		);
		const badgeMd = React.createElement(
			NeoBadge,
			{ variant, size: "md" },
			"CORE",
		);

		if (!React.isValidElement(badgeSm) || !React.isValidElement(badgeMd)) {
			throw new Error(
				`Failed to create NeoBadge element for variant ${variant}`,
			);
		}
		if (badgeSm.props.size !== "sm" || badgeMd.props.size !== "md") {
			throw new Error(`Badge size prop mismatch for variant ${variant}`);
		}
	}

	// 5. Test NeoInput props
	const inputElem = React.createElement(NeoInput, {
		label: "EMAIL ADDRESS",
		placeholder: "student@university.edu",
		helperText: "Use institutional domain",
		error: "Invalid email",
		value: "test@",
	});

	if (!React.isValidElement(inputElem)) {
		throw new Error("Failed to create NeoInput element");
	}
	if (inputElem.props.label !== "EMAIL ADDRESS") {
		throw new Error("NeoInput label prop mismatch");
	}
	if (inputElem.props.error !== "Invalid email") {
		throw new Error("NeoInput error prop mismatch");
	}
	if (inputElem.props.helperText !== "Use institutional domain") {
		throw new Error("NeoInput helperText prop mismatch");
	}

	console.log("All Neo Primitives tests passed successfully!");
}

// Run test directly when executed
testNeoPrimitives();
