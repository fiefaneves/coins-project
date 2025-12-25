const formatarDataParaBanco = (dataStr) => {
    if (!dataStr) return null;
    if (dataStr.includes('/')) {
        const [dia, mes, ano] = dataStr.split('/');
        return `${ano}-${mes}-${dia}`;
    }
    return dataStr;
};

const toNum = (str) => {
    if (!str || str.toString().trim() === '') return null;
    return parseFloat(str.toString().replace(',', '.'));
};

module.exports = { formatarDataParaBanco, toNum };