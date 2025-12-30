<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import type { PageData } from './$types';
	import type { Employment } from '$lib/server/types';

	let { data }: { data: PageData } = $props();

	const fullName = $derived(
		[data.profile?.first_name, data.profile?.second_name].filter(Boolean).join(' ') || 'User'
	);
	const currentEmployment = $derived(
		data.profile?.employments?.find((e: Employment) => e.is_current)
	);
	const location = $derived(
		[data.profile?.city, data.profile?.country].filter(Boolean).join(', ')
	);
</script>

<Navbar user={data.user} profile={data.profile} />

<div class="min-h-screen w-full" style={data.backgroundStyle}>
	<main class="max-w-2xl mx-auto px-4 py-8">
		{#if data.backgroundBlocked}
			<div class="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
				<strong>Warning:</strong> Your custom background was blocked. {data.backgroundBlockedReason ||
					'Please check your CSS.'}
			</div>
		{/if}

		<div class="flex items-center gap-6 mb-8">
			<img
				src={data.profile?.profile_picture || '/default-avatar.jpg'}
				alt={fullName}
				class="w-24 h-24 rounded-full object-cover border-2"
				style="border-color: {data.textColors.border}"
			/>
			<div>
				<h1 class="text-3xl font-bold" style="color: {data.textColors.primary}">
					{fullName}
				</h1>
				{#if currentEmployment}
					<p class="text-lg" style="color: {data.textColors.secondary}">
						{currentEmployment.title} @ {currentEmployment.company.name}
					</p>
				{/if}
				{#if location}
					<p style="color: {data.textColors.muted}">{location}</p>
				{/if}
			</div>
		</div>

		{#if data.isOwnProfile}
			<a
				href="/profile/edit"
				class="inline-block bg-red-500 text-white py-2 px-4 rounded-md font-medium hover:bg-red-600 transition-colors"
			>
				Edit Profile
			</a>
		{/if}
	</main>
</div>
