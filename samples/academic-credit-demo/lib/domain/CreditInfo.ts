export interface CreditInfo {
  credit_id: string;
  student_id: string;
  course_code: string;
  course_name: string;
  academic_term: string;
  grade: 'A' | 'B' | 'C';
}
