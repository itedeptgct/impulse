module.exports = {
	expo: {
		name: "Impulse",
		slug: "impulse",
		scheme: "impulse",
		version: "1.0.0",
		orientation: "portrait",
		icon: "./assets/icon.png",
		userInterfaceStyle: "automatic",
		android: {
			googleServicesFile:
				process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
			predictiveBackGestureEnabled: false,
			package: "com.janleigh.impulse",
			permissions: [
				"android.permission.RECORD_AUDIO",
				"android.permission.POST_NOTIFICATIONS",
			],
			intentFilters: [
				{
					action: "VIEW",
					autoVerify: true,
					data: [
						{
							scheme: "https",
							host: "impulse-app.pages.dev",
							pathPrefix: "/post",
						},
					],
					category: ["BROWSABLE", "DEFAULT"],
				},
			],
		},
		plugins: [
			"expo-router",
			"expo-status-bar",
			"expo-image",
			[
				"expo-image-picker",
				{
					photosPermission:
						"Allow Impulse to access your photos so you can attach media to posts.",
				},
			],
			"expo-font",
			"expo-web-browser",
			[
				"expo-splash-screen",
				{
					backgroundColor: "#FAF9F5",
					image: "./assets/icon.png",
					imageWidth: 220,
					resizeMode: "contain",
				},
			],
			"expo-sharing",
			"expo-notifications",
		],
		extra: {
			router: {},
			eas: {
				projectId: "9a4799d7-c269-4a7c-93b8-09fec77e0b50",
			},
		},
		owner: "janleigh",
		runtimeVersion: {
			policy: "appVersion",
		},
		updates: {
			url: "https://u.expo.dev/9a4799d7-c269-4a7c-93b8-09fec77e0b50",
		},
		ios: {},
	},
};
