// Razorpay checkout helper (client-side)
// Loads the checkout script once and opens the modal.

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let loadPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(s);
  });
  return loadPromise;
}

interface RzpResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export async function openRazorpay(opts: {
  keyId: string;
  amount: number;
  currency: string;
  orderId: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string };
  onSuccess: (r: RzpResponse) => void;
  onDismiss?: () => void;
}) {
  await loadScript();
  const Rzp = (window as unknown as { Razorpay: new (o: unknown) => { open: () => void } })
    .Razorpay;
  const rzp = new Rzp({
    key: opts.keyId,
    amount: opts.amount,
    currency: opts.currency,
    order_id: opts.orderId,
    name: opts.name,
    description: opts.description,
    prefill: opts.prefill ?? {},
    theme: { color: "#c87555" },
    handler: (r: RzpResponse) => opts.onSuccess(r),
    modal: { ondismiss: () => opts.onDismiss?.() },
  });
  rzp.open();
}
