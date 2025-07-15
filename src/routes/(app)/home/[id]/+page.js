export async function load({ params }) {
	const { id } = params;

	// Return the observer ID so the component can fetch data client-side
	return {
		observerId: id,
		observer: null
	};
}
