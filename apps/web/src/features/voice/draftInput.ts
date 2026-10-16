import { MAX_AI_TEXT } from "./audioContract";

export function validText(text: string) {
  const length = Array.from(text.trim()).length;
  return length > 0 && length <= MAX_AI_TEXT;
}

export function clarifiedText(transcript: string, correction: string) {
  const text = `${transcript.trim()}\nНақтылау / Уточнение: ${correction.trim()}`;
  return correction.trim() && validText(text) ? text : null;
}
