export interface MeetingRecord {
  id: string;
  title: string;
  timestamp: string;
  duration: number; // in seconds
  transcript: string;
  formattedText: string;
}
