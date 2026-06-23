declare module 'react-native-razorpay' {
  interface RazorpayOptions {
    key: string;
    amount: number;
    currency?: string;
    order_id: string;
    name?: string;
    description?: string;
    prefill?: { contact?: string; email?: string; name?: string };
    theme?: { color?: string };
  }
  interface RazorpaySuccessResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }
  const RazorpayCheckout: {
    open(options: RazorpayOptions): Promise<RazorpaySuccessResponse>;
  };
  export default RazorpayCheckout;
}
