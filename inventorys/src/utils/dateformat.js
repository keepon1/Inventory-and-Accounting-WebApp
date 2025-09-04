export const isCompleteInput = (input) => {
  if (!input.trim()) return false;

  const periodSingle = /^p(1[0-2]|[1-9])$/i;
  const periodRange = /^p(1[0-2]|[1-9])\.\.\.p(1[0-2]|[1-9])$/i;

  const dateRegex = /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/;
  const dateRangeRegex = /^\d{1,2}[-/]\d{1,2}[-/]\d{4}\.\.\.\d{1,2}[-/]\d{1,2}[-/]\d{4}$/;

  return (
    periodSingle.test(input) ||
    periodRange.test(input) ||
    dateRegex.test(input) ||
    dateRangeRegex.test(input)
  );
};


export const handleDateSearch = (input) => {
  const parts = input.trim().split('...');
  let result = {};

  const parseDate = (str) => {
    if (/^p\d{1,2}$/i.test(str)) {
      return { type: 'period', month: parseInt(str.slice(1)) };
    } else if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(str)) {
      const delimiter = str.includes('/') ? '/' : '-';
      const [day, month, year] = str.split(delimiter).map(p => p.padStart(2, '0'));
      return { type: 'date', date: `${year}-${month}-${day}` };
    }
    return null;
  };

  if (parts.length === 1) {
    const single = parseDate(parts[0]);
    if (!single) throw new Error('Invalid input format');

    result = single.type === 'period'
      ? { type: 'period', start_month: single.month, end_month: single.month }
      : { type: 'date', start_date: single.date, end_date: single.date };

  } else if (parts.length === 2) {
    const from = parseDate(parts[0]);
    const to = parseDate(parts[1]);

    if (!from || !to || from.type !== to.type)
      throw new Error('Mismatched or invalid interval input');

    if (from.type === 'period') {
      if (to.month < from.month)
        throw new Error(`End period (p${to.month}) cannot be before start (p${from.month})`);
      result = {
        type: 'period',
        start_month: from.month,
        end_month: to.month,
      };
    } else {
      if (to.date < from.date)
        throw new Error(`End date cannot be before start date`);
      result = {
        type: 'date',
        start_date: from.date,
        end_date: to.date,
      };
    }
  } else {
    throw new Error('Invalid range format');
  }

  return result;
};
