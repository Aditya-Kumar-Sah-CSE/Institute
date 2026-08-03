import sys

css_code = """
/* Premium Pricing Cards - Glassmorphic Dark Glow */
.premium-pricing-card {
  background: linear-gradient(145deg, rgba(15, 23, 42, 0.9) 0%, rgba(10, 15, 30, 0.95) 100%);
  border: 1px solid rgba(79, 70, 229, 0.3);
  border-radius: 24px;
  padding: 3rem 2rem;
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 40px rgba(79, 70, 229, 0.1), inset 0 0 20px rgba(79, 70, 229, 0.05);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
}

.premium-pricing-card:hover {
  transform: translateY(-5px);
  border-color: rgba(79, 70, 229, 0.6);
  box-shadow: 0 10px 50px rgba(79, 70, 229, 0.2), inset 0 0 30px rgba(79, 70, 229, 0.1);
}

.premium-pricing-card.popular {
  border: 1px solid rgba(139, 92, 246, 0.5);
  box-shadow: 0 0 50px rgba(139, 92, 246, 0.15), inset 0 0 20px rgba(139, 92, 246, 0.1);
}

.premium-pricing-card.popular:hover {
  border-color: rgba(139, 92, 246, 0.8);
  box-shadow: 0 10px 60px rgba(139, 92, 246, 0.25), inset 0 0 30px rgba(139, 92, 246, 0.15);
}

/* Background watermark cap */
.pricing-watermark {
  position: absolute;
  top: 40px;
  right: -20px;
  width: 150px;
  height: 150px;
  opacity: 0.03;
  pointer-events: none;
  transform: rotate(15deg);
  background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>') no-repeat center center;
  background-size: contain;
}

.pricing-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.pricing-plan-name {
  font-size: 2.5rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: 1px;
  margin: 0;
  line-height: 1;
}

.pricing-plan-tag {
  background: rgba(16, 185, 129, 0.1);
  color: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.2);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.pricing-plan-tag.popular-tag {
  background: rgba(139, 92, 246, 0.1);
  color: #a78bfa;
  border: 1px solid rgba(139, 92, 246, 0.3);
}

.pricing-subtitle {
  color: #94a3b8;
  font-size: 1rem;
  margin-bottom: 2rem;
}

.pricing-price-box {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 2rem;
}

.pricing-amount {
  font-size: 4rem;
  font-weight: 800;
  color: #fff;
  line-height: 1;
}

.pricing-period {
  font-size: 1.1rem;
  color: #94a3b8;
  font-weight: 500;
}

.pricing-btn {
  background: linear-gradient(90deg, #4f46e5, #8b5cf6);
  color: #fff;
  border: none;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  width: 100%;
  margin-bottom: 2rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
}

.pricing-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(139, 92, 246, 0.6);
  filter: brightness(1.1);
}

.pricing-divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.pricing-divider-line {
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.05);
}

.pricing-divider-icon {
  color: #6366f1;
}

.pricing-features-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
  flex: 1;
}

.p-feature {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.p-feature:last-child {
  border-bottom: none;
}

.p-f-icon-box {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.02);
}

.p-f-icon-box.blue { border: 1px solid rgba(59, 130, 246, 0.3); color: #60a5fa; box-shadow: 0 0 10px rgba(59, 130, 246, 0.1); }
.p-f-icon-box.green { border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; box-shadow: 0 0 10px rgba(16, 185, 129, 0.1); }
.p-f-icon-box.purple { border: 1px solid rgba(168, 85, 247, 0.3); color: #c084fc; box-shadow: 0 0 10px rgba(168, 85, 247, 0.1); }
.p-f-icon-box.orange { border: 1px solid rgba(245, 158, 11, 0.3); color: #fbbf24; box-shadow: 0 0 10px rgba(245, 158, 11, 0.1); }

.p-f-text {
  flex: 1;
  color: #cbd5e1;
  font-size: 1rem;
}

.p-f-text strong {
  color: #fff;
  font-weight: 600;
}

.p-f-check {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

.pricing-footer-box {
  background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.pricing-footer-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.1);
  color: #a78bfa;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pricing-footer-text h4 {
  margin: 0 0 4px 0;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
}

.pricing-footer-text p {
  margin: 0;
  color: #94a3b8;
  font-size: 0.85rem;
}

"""

with open('d:/Institute/institute1/src/app/Landing.css', 'a', encoding='utf-8') as f:
    f.write('\n' + css_code)
print("CSS appended successfully!")
