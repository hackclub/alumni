<script lang="ts">
	import { enhance } from '$app/forms';
	import Navbar from '$lib/components/Navbar.svelte';
	import type { PageData, ActionData } from './$types';
	import type { Employment } from '$lib/types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let profile = $derived({ ...data.profile });
	let profilePicturePreview = $derived(data.profile?.profile_picture ?? '/default-avatar.jpg');
	let pictureFormRef = $state<HTMLFormElement | null>(null);
	let fileSizeError = $state<string | null>(null);
	let isSavingPicture = $state(false);
	let showAddEmployment = $state(false);
	let editingEmploymentId = $state<string | null>(null);

	const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

	async function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		fileSizeError = null;

		if (file.size > MAX_FILE_SIZE) {
			fileSizeError = 'File size must be less than 2MB';
			input.value = '';
			return;
		}

		const reader = new FileReader();
		reader.onload = async () => {
			const base64 = reader.result as string;
			const hiddenInput = pictureFormRef?.querySelector(
				'input[name="profile_picture"]'
			) as HTMLInputElement;
			if (hiddenInput) {
				hiddenInput.value = base64;
			}
			isSavingPicture = true;
			pictureFormRef?.requestSubmit();
		};
		reader.readAsDataURL(file);
	}

	function handlePictureFormResult() {
		isSavingPicture = false;
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '';
		return dateStr.split('T')[0];
	}

	function getCurrentJob(employments: Employment[]): Employment | null {
		return employments.find(e => e.is_current) ?? null;
	}
</script>

<Navbar user={data.user} profile={data.profile} />

<main class="max-w-2xl mx-auto px-4 py-8">
	<h1 class="text-3xl font-bold text-gray-900 mb-8">Edit Profile</h1>

	{#if form?.success}
		<div class="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
			Profile updated successfully!
		</div>
	{/if}

	{#if form?.error}
		<div class="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
			{form.error}
		</div>
	{/if}

	<div class="flex flex-col items-center gap-4 mb-6">
		<img
			src={profilePicturePreview}
			alt="Profile"
			class="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
		/>
		{#if fileSizeError}
			<p class="text-red-500 text-sm">{fileSizeError}</p>
		{/if}
		{#if isSavingPicture}
			<p class="text-gray-500 text-sm">Saving...</p>
		{/if}
		<div class="flex gap-2">
			<label
				for="profile_picture"
				class="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md transition-colors"
			>
				Change Profile Picture
			</label>
			{#if data.profile?.profile_picture}
				<form method="POST" action="?/removePicture" use:enhance={() => { isSavingPicture = true; return async ({ update }) => { isSavingPicture = false; await update(); }; }}>
					<button
						type="submit"
						class="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-md transition-colors"
					>
						Remove
					</button>
				</form>
			{/if}
		</div>
		<form
			method="POST"
			action="?/updatePicture"
			bind:this={pictureFormRef}
			use:enhance={() => { return async ({ update }) => { isSavingPicture = false; await update(); }; }}
		>
			<input type="hidden" name="profile_picture" value="" />
		</form>
		<input
			type="file"
			id="profile_picture"
			accept="image/*"
			onchange={handleFileChange}
			class="hidden"
		/>
	</div>

	<form method="POST" action="?/updateProfile" class="space-y-6" id="profile-form">

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<div>
				<label for="first_name" class="block text-sm font-medium text-gray-700 mb-1">
					First Name
				</label>
				<input
					type="text"
					id="first_name"
					name="first_name"
					bind:value={profile.first_name}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
				/>
			</div>

			<div>
				<label for="second_name" class="block text-sm font-medium text-gray-700 mb-1">
					Last Name
				</label>
				<input
					type="text"
					id="second_name"
					name="second_name"
					bind:value={profile.second_name}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
				/>
			</div>
		</div>

		<div>
			<label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
			<input
				type="email"
				id="email"
				name="email"
				bind:value={profile.email}
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
			/>
		</div>

		<div>
			<label for="phone_number" class="block text-sm font-medium text-gray-700 mb-1">
				Phone Number
			</label>
			<input
				type="tel"
				id="phone_number"
				name="phone_number"
				bind:value={profile.phone_number}
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
			/>
		</div>

		<hr class="border-gray-200" />
		<h2 class="text-xl font-semibold text-gray-800">Social Links</h2>

		<div>
			<label for="github_username" class="block text-sm font-medium text-gray-700 mb-1">
				GitHub Username
			</label>
			<input
				type="text"
				id="github_username"
				name="github_username"
				bind:value={profile.github_username}
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
			/>
		</div>

		<div>
			<label for="instagram" class="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
			<input
				type="text"
				id="instagram"
				name="instagram"
				bind:value={profile.instagram}
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
			/>
		</div>

		<div>
			<label for="linkedin" class="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
			<input
				type="text"
				id="linkedin"
				name="linkedin"
				bind:value={profile.linkedin}
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
			/>
		</div>

		<div>
			<label for="personal_site" class="block text-sm font-medium text-gray-700 mb-1">
				Personal Website
			</label>
			<input
				type="url"
				id="personal_site"
				name="personal_site"
				bind:value={profile.personal_site}
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
			/>
		</div>

		<hr class="border-gray-200" />
		<h2 class="text-xl font-semibold text-gray-800">Profile Customization</h2>

		<div>
			<label for="custom_background" class="block text-sm font-medium text-gray-700 mb-1">
				Custom Background CSS
			</label>
			<textarea
				id="custom_background"
				name="custom_background"
				rows="3"
				bind:value={profile.custom_background}
				placeholder="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm"
			></textarea>
			<p class="mt-1 text-xs text-gray-500">
				Enter CSS background properties (e.g., <code class="bg-gray-100 px-1 rounded">background-color: #f0f0f0;</code> or <code class="bg-gray-100 px-1 rounded">background-image: url(...);</code>).
				Only <code class="bg-gray-100 px-1 rounded">background-*</code> properties are allowed.
			</p>
		</div>

		<hr class="border-gray-200" />
		<h2 class="text-xl font-semibold text-gray-800">Location</h2>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<div>
				<label for="city" class="block text-sm font-medium text-gray-700 mb-1">City</label>
				<input
					type="text"
					id="city"
					name="city"
					bind:value={profile.city}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
				/>
			</div>

			<div>
				<label for="state" class="block text-sm font-medium text-gray-700 mb-1">State</label>
				<input
					type="text"
					id="state"
					name="state"
					bind:value={profile.state}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
				/>
			</div>

			<div>
				<label for="country" class="block text-sm font-medium text-gray-700 mb-1">Country</label>
				<input
					type="text"
					id="country"
					name="country"
					bind:value={profile.country}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
				/>
			</div>
		</div>

	</form>

	<hr class="border-gray-200 my-8" />
	<h2 class="text-xl font-semibold text-gray-800 mb-4">Work / School Experience</h2>

	{#if profile.employments && profile.employments.length > 0}
		<div class="space-y-4 mb-6">
			{#each profile.employments as employment}
				<div class="border border-gray-200 rounded-lg p-4">
					{#if editingEmploymentId === employment.employment_id}
						<form method="POST" action="?/updateEmployment" use:enhance={() => {
							return async ({ update }) => {
								editingEmploymentId = null;
								await update();
							};
						}}>
							<input type="hidden" name="employment_id" value={employment.employment_id} />
							<div class="space-y-4">
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1" for="company_name_{employment.employment_id}">Company / School</label>
									<input
										type="text"
										name="company_name"
										id="company_name_{employment.employment_id}"
										value={employment.company.name}
										class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
									/>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1" for="title_{employment.employment_id}">Title</label>
									<input
										type="text"
										name="title"
										id="title_{employment.employment_id}"
										value={employment.title}
										class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
									/>
								</div>
								<div class="grid grid-cols-2 gap-4">
									<div>
										<label class="block text-sm font-medium text-gray-700 mb-1" for="start_date_{employment.employment_id}">Start Date</label>
										<input
											type="date"
											name="start_date"
											id="start_date_{employment.employment_id}"
											value={formatDate(employment.start_date)}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
										/>
									</div>
									<div>
										<label class="block text-sm font-medium text-gray-700 mb-1" for="end_date_{employment.employment_id}">End Date</label>
										<input
											type="date"
											name="end_date"
											id="end_date_{employment.employment_id}"
											value={formatDate(employment.end_date)}
											disabled={employment.is_current}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
										/>
									</div>
								</div>
								<div class="flex items-center gap-2">
									<input
										type="checkbox"
										name="is_current"
										id="edit_is_current_{employment.employment_id}"
										checked={employment.is_current}
										class="rounded border-gray-300 text-red-500 focus:ring-red-500"
									/>
									<label for="edit_is_current_{employment.employment_id}" class="text-sm text-gray-700">Current position</label>
								</div>
								<div class="flex gap-2">
									<button type="submit" class="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600">
										Save
									</button>
									<button type="button" onclick={() => editingEmploymentId = null} class="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
										Cancel
									</button>
								</div>
							</div>
						</form>
					{:else}
						<div class="flex justify-between items-start">
							<div>
								<h3 class="font-semibold text-gray-900">{employment.title}</h3>
								<p class="text-gray-600">{employment.company.name}</p>
								<p class="text-sm text-gray-500">
									{#if employment.start_date}
										{new Date(employment.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
									{/if}
									{#if employment.start_date && (employment.end_date || employment.is_current)}
										–
									{/if}
									{#if employment.is_current}
										Present
									{:else if employment.end_date}
										{new Date(employment.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
									{/if}
								</p>
							</div>
							<div class="flex gap-2">
								<button
									onclick={() => editingEmploymentId = employment.employment_id}
									class="text-gray-500 hover:text-gray-700"
								>
									Edit
								</button>
								<form method="POST" action="?/deleteEmployment" use:enhance>
									<input type="hidden" name="employment_id" value={employment.employment_id} />
									<button type="submit" class="text-red-500 hover:text-red-700">
										Delete
									</button>
								</form>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-gray-500 mb-4">No work experience added yet.</p>
	{/if}

	{#if showAddEmployment}
		<form method="POST" action="?/addEmployment" class="border border-gray-200 rounded-lg p-4 space-y-4" use:enhance={() => {
			return async ({ update }) => {
				showAddEmployment = false;
				await update();
			};
		}}>
			<div>
				<label for="new_company_name" class="block text-sm font-medium text-gray-700 mb-1">Company</label>
				<input
					type="text"
					id="new_company_name"
					name="company_name"
					required
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
				/>
			</div>
			<div>
				<label for="new_title" class="block text-sm font-medium text-gray-700 mb-1">Title</label>
				<input
					type="text"
					id="new_title"
					name="title"
					required
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
				/>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="new_start_date" class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
					<input
						type="date"
						id="new_start_date"
						name="start_date"
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
					/>
				</div>
				<div>
					<label for="new_end_date" class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
					<input
						type="date"
						id="new_end_date"
						name="end_date"
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
					/>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<input
					type="checkbox"
					name="is_current"
					id="new_is_current"
					class="rounded border-gray-300 text-red-500 focus:ring-red-500"
				/>
				<label for="new_is_current" class="text-sm text-gray-700">This is my current position</label>
			</div>
			<div class="flex gap-2">
				<button type="submit" class="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600">
					Add Employment
				</button>
				<button type="button" onclick={() => showAddEmployment = false} class="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
					Cancel
				</button>
			</div>
		</form>
	{:else}
		<button
			onclick={() => showAddEmployment = true}
			class="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
		>
			+ Add Work Experience
		</button>
	{/if}

	<div class="pt-8">
		<button
			type="submit"
			form="profile-form"
			class="w-full bg-red-500 text-white py-3 px-4 rounded-md font-medium hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
		>
			Save Changes
		</button>
	</div>
</main>
