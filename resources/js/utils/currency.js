export const getCurrencySymbol = (settings) => settings?.currency_symbol || '$';

export const formatMoney = (amount, symbol = '$') => {
    const n = parseFloat(amount) || 0;
    return `${symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
