export const moods = {
  receptive: { label: "열린 마음", english: "RECEPTIVE", description: "발언에서 긍정적으로 받아들이는 반응이 보여요.", color: "lilac" },
  curious: { label: "궁금한 마음", english: "CURIOUS", description: "더 알아보려는 질문과 관심이 드러나요.", color: "blue" },
  concerned: { label: "조심스러운 마음", english: "CONCERNED", description: "발언에 걱정이나 망설임이 담겨 있어요.", color: "peach" },
  frustrated: { label: "답답한 마음", english: "FRUSTRATED", description: "불편함이나 답답함을 표현하고 있어요.", color: "rose" },
  neutral: { label: "담담한 흐름", english: "NEUTRAL", description: "뚜렷한 감정 표현 없이 내용을 전달하고 있어요.", color: "silver" },
  unclear: { label: "조금 더 들어볼게요", english: "LISTENING", description: "반응을 읽기에는 아직 맥락이 충분하지 않아요.", color: "lilac" },
} as const;
export type Mood = keyof typeof moods;
export type Analysis = { mood: Mood; confidence: number; signals: { label: string; value: number }[]; at: number };
export type Utterance = { id: string; text: string; at: number; source: "speech" | "text" | "demo" };

export const demoLines = [
  "오늘은 새 프로젝트의 방향을 같이 이야기해 보면 좋겠어요.",
  "보내주신 시안을 봤는데, 전체적인 방향이 정말 마음에 들어요.",
  "특히 처음 사용하는 사람도 쉽게 이해할 수 있다는 점이 좋네요.",
  "다만 이번 주 안에 마무리하기에는 일정이 조금 걱정돼요.",
  "우선 중요한 기능부터 정리해서 시작하면 어떨까요?",
  "네, 그렇게 하면 좋겠어요. 같이 한번 해봐요.",
];
export const demoMoods: Mood[] = ["neutral", "receptive", "receptive", "concerned", "curious", "receptive"];
