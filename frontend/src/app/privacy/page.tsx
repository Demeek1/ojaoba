export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-10">Last updated: May 2, 2026</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Introduction</h2>
            <p>Welcome to Ojaoba ("we", "our", "us"). We operate ojaoba.com and related services. This Privacy Policy explains how we collect, use, and protect your personal information when you use our WhatsApp-based food marketplace service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>WhatsApp phone number</strong> — to identify you and send order updates.</li>
              <li><strong>Name</strong> — provided by you during checkout.</li>
              <li><strong>Delivery address</strong> — to fulfill your orders.</li>
              <li><strong>Order history</strong> — items purchased, prices, and order status.</li>
              <li><strong>Chat messages</strong> — interactions with our WhatsApp chatbot to process your requests.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To process and fulfill your food orders.</li>
              <li>To send order confirmations and delivery updates via WhatsApp.</li>
              <li>To provide customer support.</li>
              <li>To improve our services and chatbot experience.</li>
              <li>To process payments securely via Paystack.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. WhatsApp &amp; Meta</h2>
            <p>We use the WhatsApp Business API provided by Meta Platforms, Inc. to communicate with customers. By messaging us on WhatsApp, you agree to Meta's <a href="https://www.whatsapp.com/legal/terms-of-service" className="text-emerald-600 underline">Terms of Service</a> and <a href="https://www.whatsapp.com/legal/privacy-policy" className="text-emerald-600 underline">Privacy Policy</a>. We only use WhatsApp to respond to your messages, process orders, and send transactional updates.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Data Sharing</h2>
            <p>We do not sell your personal data. We may share data with:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Paystack</strong> — to process payments securely.</li>
              <li><strong>Delivery partners</strong> — your name and address to fulfill orders.</li>
              <li><strong>Meta (WhatsApp)</strong> — as required to operate the WhatsApp Business API.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Data Retention</h2>
            <p>We retain your data for as long as necessary to provide our services and comply with legal obligations. You may request deletion of your data at any time by contacting us.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at <a href="mailto:support@ojaoba.com" className="text-emerald-600 underline">support@ojaoba.com</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Security</h2>
            <p>We implement industry-standard security measures to protect your data, including SSL encryption, secure database storage, and limited access controls.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Contact Us</h2>
            <p>If you have questions about this Privacy Policy, contact us at:</p>
            <div className="mt-2">
              <p><strong>Ojaoba Food Market</strong></p>
              <p>Email: <a href="mailto:support@ojaoba.com" className="text-emerald-600 underline">support@ojaoba.com</a></p>
              <p>Website: <a href="https://ojaoba-fawn.vercel.app" className="text-emerald-600 underline">ojaoba-fawn.vercel.app</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
