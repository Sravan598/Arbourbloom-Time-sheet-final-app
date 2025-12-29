import React from 'react';
import { motion } from 'framer-motion';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/Accordion';

const faqs = [
  {
    question: 'How does the 14-day free trial work?',
    answer: 'You can sign up and use all features of your chosen plan for 14 days without providing payment information. At the end of the trial, you can upgrade to a paid plan or your account will be paused until you subscribe.',
  },
  {
    question: 'Can employees clock in from their mobile devices?',
    answer: 'Yes! CORtracker has native iOS and Android apps that allow employees to clock in/out from anywhere. You can enable GPS verification to ensure employees are at approved locations when clocking in.',
  },
  {
    question: 'Does CORtracker integrate with payroll systems?',
    answer: 'Absolutely. We integrate with popular payroll providers including ADP, Gusto, QuickBooks, Paychex, and more. Our API also allows custom integrations with your existing HR systems.',
  },
  {
    question: 'How is overtime calculated?',
    answer: 'CORtracker automatically calculates overtime based on your configured rules. We support federal, state, and custom overtime policies including daily overtime, weekly overtime, and double-time calculations.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Security is our top priority. We use 256-bit SSL encryption, SOC 2 Type II certified data centers, and regular security audits. All data is backed up daily with 99.9% uptime guarantee.',
  },
  {
    question: 'Can I switch plans later?',
    answer: "Yes, you can upgrade or downgrade your plan at any time. When upgrading, you'll have immediate access to new features. When downgrading, changes take effect at the start of your next billing cycle.",
  },
];

const FAQ = () => {
  return (
    <section id="faq" className="py-24 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="text-brand-red font-semibold text-sm uppercase tracking-wider">
            FAQ
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-brand-dark">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Have questions? We have answers.
          </p>
        </motion.div>

        {/* Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Accordion>
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`faq-${index}`}>
                <AccordionTrigger data-testid={`faq-trigger-${index}`}>
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent data-testid={`faq-content-${index}`}>
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;
