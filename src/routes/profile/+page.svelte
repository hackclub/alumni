<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const name = $derived(data.profile?.first_name || 'User');
</script>

<Navbar user={data.user} profile={data.profile} />

<main class="max-w-2xl mx-auto px-4 py-8 min-h-screen" style={data.backgroundStyle}>
	{#if data.backgroundBlocked}
		<div class="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
			<strong>Warning:</strong> Your custom background was blocked. {data.backgroundBlockedReason || 'Please check your CSS.'}
		</div>
	{/if}

	<h1 class="text-3xl font-bold text-gray-900 mb-4">Hello {name}, here is your profile</h1>

	<a
		href="/profile/edit"
		class="inline-block bg-red-500 text-white py-2 px-4 rounded-md font-medium hover:bg-red-600 transition-colors"
	>
		Edit Profile
	</a>
</main>
