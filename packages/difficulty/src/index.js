export const DIFFICULTY_LEVELS = ['easy', 'normal', 'hard'];
const DIFFICULTY_PROFILES = {
    easy: {
        aggression: 0.25,
        greed: 0.35,
        riskTolerance: 0.2,
        focusBias: 0.2,
        randomness: 0.7,
    },
    normal: {
        aggression: 0.5,
        greed: 0.5,
        riskTolerance: 0.4,
        focusBias: 0.5,
        randomness: 0.35,
    },
    hard: {
        aggression: 0.7,
        greed: 0.65,
        riskTolerance: 0.55,
        focusBias: 0.75,
        randomness: 0.1,
    },
};
export const listDifficultyLevels = () => [
    ...DIFFICULTY_LEVELS,
];
export const getDifficultyProfile = (level) => ({
    ...DIFFICULTY_PROFILES[level],
});
//# sourceMappingURL=index.js.map