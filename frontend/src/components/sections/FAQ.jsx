import React from 'react';
import { motion } from 'framer-motion';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/Accordion';

const faqs = [
  {
    question: 'Can employees clock in from their mobile devices?',
    answer: 'Yes! AurborBloom has native iOS and Android apps that allow employees to clock in/out from anywhere. You can enable GPS verification to ensure employees are at approved locations when clocking in.',
  },
  {
    question: 'Does AurborBloom integrate with payroll systems?',
    answer: 'Absolutely. We integrate with popular payroll providers including ADP, Gusto, QuickBooks, Paychex, and more. Our API also allows custom integrations with your existing HR systems.',
  },
  {
    question: 'How is overtime calculated?',
    answer: 'AurborBloom automatically calculates overtime based on your configured rules. We support federal, state, and custom overtime policies including daily overtime, weekly overtime, and double-time calculations.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Security is our top priority. We use 256-bit SSL encryption, SOC 2 Type II certified data centers, and regular security audits. All data is backed up daily with 99.9% uptime guarantee.',
  },
  {
    question: 'How do I get started with AurborBloom?',
    answer: 'Getting started is easy! Simply contact our team through the form below and we will guide you through the setup process. Our team will help you configure departments, add employees, and customize settings for your organization.',
  },
  {
    question: 'What kind of support do you offer?',
    answer: 'We offer comprehensive support including email, phone, and live chat. Enterprise customers get a dedicated account manager. Our help center also has extensive documentation and video tutorials.',
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
          <span className="text-brand-black font-semibold text-sm uppercase tracking-wider">
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
