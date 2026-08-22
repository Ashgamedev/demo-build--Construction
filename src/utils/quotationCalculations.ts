// @ts-nocheck
import { QuotationVersion, QuotationItem, QuotationSection, QuotationCharge } from '../types';

export function calculateItemAmount(item: QuotationItem): { amount: number; totalAfterDiscount: number } {
  if (!item.isIncluded || item.isOptional) {
    return { amount: 0, totalAfterDiscount: 0 };
  }
  
  const amount = item.quantity * item.unitRate;
  let totalAfterDiscount = amount;
  
  if (item.discountType === 'percentage') {
    totalAfterDiscount -= (amount * item.discountValue) / 100;
  } else {
    totalAfterDiscount -= item.discountValue;
  }
  
  return { amount, totalAfterDiscount: Math.max(0, totalAfterDiscount) };
}

export function calculateQuotation(version: Partial<QuotationVersion>) {
  let subtotal = 0; // Sum of all items after line discounts
  const sectionBreakdowns: Record<string, { total: number; discountedTotal: number }> = {};
  
  if (version.mode === 'boq' && version.sections) {
    version.sections.forEach(section => {
      let sectionTotal = 0;
      section.items?.forEach(item => {
        sectionTotal += calculateItemAmount(item).totalAfterDiscount;
      });
      
      let sectionDiscountedTotal = sectionTotal;
      if (section.discountType === 'percentage') {
        sectionDiscountedTotal -= (sectionTotal * section.discountValue) / 100;
      } else {
        sectionDiscountedTotal -= section.discountValue;
      }
      
      sectionDiscountedTotal = Math.max(0, sectionDiscountedTotal);
      sectionBreakdowns[section.id] = {
        total: sectionTotal,
        discountedTotal: sectionDiscountedTotal
      };
      
      subtotal += sectionDiscountedTotal;
    });
  } else if (version.mode === 'simple' && version.sections && version.sections.length > 0) {
    // Simple mode uses the first section
    version.sections[0].items?.forEach(item => {
      subtotal += calculateItemAmount(item).totalAfterDiscount;
    });
  }

  // Calculate additional charges
  let totalCharges = 0;
  if (version.charges) {
    version.charges.forEach(charge => {
      if (charge.type === 'percentage') {
        totalCharges += (subtotal * charge.value) / 100;
      } else {
        totalCharges += charge.value;
      }
    });
  }

  // Pre-discount total
  const preOverallDiscountTotal = subtotal + totalCharges;
  
  // Overall discount
  let overallDiscount = 0;
  if (version.overallDiscountType === 'percentage') {
    overallDiscount = (preOverallDiscountTotal * (version.overallDiscountValue || 0)) / 100;
  } else {
    overallDiscount = version.overallDiscountValue || 0;
  }
  
  // Taxable Value
  const taxableValue = Math.max(0, preOverallDiscountTotal - overallDiscount);
  
  // GST
  let gstAmount = 0;
  if (version.gstEnabled) {
    gstAmount = (taxableValue * (version.gstPercentage || 0)) / 100;
  }
  
  // Grand total before rounding
  const rawGrandTotal = taxableValue + gstAmount;
  
  // Rounding adjustment (round to nearest whole number)
  const grandTotal = Math.round(rawGrandTotal);
  const roundingAdjustment = grandTotal - rawGrandTotal;

  return {
    subtotal,
    sectionBreakdowns,
    totalCharges,
    overallDiscount,
    taxableValue,
    gstAmount,
    rawGrandTotal,
    roundingAdjustment,
    grandTotal
  };
}

