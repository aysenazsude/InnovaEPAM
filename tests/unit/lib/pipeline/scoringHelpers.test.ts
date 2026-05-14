import { extractScores } from '@/lib/pipeline/scoringHelpers';

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value);
  }
  return fd;
}

describe('extractScores', () => {
  it('should extract all five valid scores when all dimensions are provided', () => {
    const fd = makeFormData({
      score_innovation: '5',
      score_feasibility: '3',
      score_business_impact: '4',
      score_strategic_alignment: '2',
      score_technical_soundness: '1',
    });
    const result = extractScores(fd);
    expect(result).toEqual({
      scores: {
        innovation: 5,
        feasibility: 3,
        business_impact: 4,
        strategic_alignment: 2,
        technical_soundness: 1,
      },
    });
  });

  it('should return empty scores when no score fields are present', () => {
    const fd = makeFormData({ ideaId: 'abc', notes: 'hello' });
    const result = extractScores(fd);
    expect(result).toEqual({ scores: {} });
  });

  it('should skip absent dimensions and return only provided ones', () => {
    const fd = makeFormData({
      score_innovation: '4',
      score_feasibility: '2',
    });
    const result = extractScores(fd);
    expect(result).toEqual({
      scores: {
        innovation: 4,
        feasibility: 2,
      },
    });
  });

  it('should return error when score is 0 (below minimum)', () => {
    const fd = makeFormData({ score_innovation: '0' });
    const result = extractScores(fd);
    expect('error' in result).toBe(true);
  });

  it('should return error when score is 6 (above maximum)', () => {
    const fd = makeFormData({ score_feasibility: '6' });
    const result = extractScores(fd);
    expect('error' in result).toBe(true);
  });

  it('should return error when score is non-numeric', () => {
    const fd = makeFormData({ score_business_impact: 'abc' });
    const result = extractScores(fd);
    expect('error' in result).toBe(true);
  });

  it('should return error when score is a float', () => {
    const fd = makeFormData({ score_strategic_alignment: '2.5' });
    const result = extractScores(fd);
    expect('error' in result).toBe(true);
  });

  it('should return error for negative score', () => {
    const fd = makeFormData({ score_technical_soundness: '-1' });
    const result = extractScores(fd);
    expect('error' in result).toBe(true);
  });

  it('should parse boundary values 1 and 5 as valid', () => {
    const fd = makeFormData({
      score_innovation: '1',
      score_technical_soundness: '5',
    });
    const result = extractScores(fd);
    expect(result).toEqual({
      scores: { innovation: 1, technical_soundness: 5 },
    });
  });
});
