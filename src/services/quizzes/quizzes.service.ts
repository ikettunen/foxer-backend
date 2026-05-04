import pool from '../../config/db'
import { Quiz, QuizQuestion, QuizResult } from '../../types'

export class QuizzesService {
  static async getByLesson(lessonId: string): Promise<Quiz & { questions: QuizQuestion[] }> {
    const [quizzes] = await pool.query('SELECT * FROM quizzes WHERE lesson_id = ?', [lessonId]) as [any[], any]
    if (quizzes.length === 0) throw Object.assign(new Error('Quiz not found'), { statusCode: 404 })
    const quiz = quizzes[0]
    const [questions] = await pool.query(
      'SELECT id, quiz_id, question, question_en, options_json, sort_order FROM quiz_questions WHERE quiz_id = ? ORDER BY sort_order ASC',
      [quiz.id],
    ) as [any[], any]
    // Strip correct answers from student-facing response
    return { ...quiz, questions }
  }

  static async submit(userId: number, lessonId: string, answers: Record<number, string>): Promise<QuizResult> {
    const [quizzes] = await pool.query('SELECT * FROM quizzes WHERE lesson_id = ?', [lessonId]) as [any[], any]
    if (quizzes.length === 0) throw Object.assign(new Error('Quiz not found'), { statusCode: 404 })
    const quizId = quizzes[0].id

    const [questions] = await pool.query(
      'SELECT * FROM quiz_questions WHERE quiz_id = ?',
      [quizId],
    ) as [any[], any]

    let correct = 0
    const resultAnswers = questions.map((q: any) => {
      const isCorrect = answers[q.id] === q.answer
      if (isCorrect) correct++
      return { question_id: q.id, correct: isCorrect, correct_answer: q.answer }
    })

    const score  = Math.round((correct / questions.length) * 100)
    const passed = score >= 70

    // Save to progress
    if (passed) {
      await pool.execute(
        `INSERT INTO progress (user_id, course_id, day_number, quiz_passed, quiz_score, quiz_at)
         SELECT ?, cd.course_id, cd.day_number, 1, ?, NOW()
         FROM lessons l JOIN course_days cd ON l.course_day_id = cd.id
         WHERE l.id = ?
         ON DUPLICATE KEY UPDATE quiz_passed = 1, quiz_score = ?, quiz_at = NOW()`,
        [userId, score, lessonId, score],
      )
    }

    return { score, total: questions.length, passed, answers: resultAnswers }
  }

  static async getResults(userId: number, lessonId: string) {
    // TODO: implement — return past quiz attempts for this user/lesson
    const [rows] = await pool.query(
      `SELECT p.* FROM progress p
       JOIN lessons l ON p.course_id = (SELECT cd.course_id FROM course_days cd JOIN lessons ll ON ll.course_day_id = cd.id WHERE ll.id = ?)
       WHERE p.user_id = ?`,
      [lessonId, userId],
    ) as [any[], any]
    return rows
  }

  static async create(data: { lesson_id: string; title?: string; questions?: Partial<QuizQuestion>[] }) {
    const [result] = await pool.execute(
      'INSERT INTO quizzes (lesson_id, title) VALUES (?, ?)',
      [data.lesson_id, data.title || null],
    ) as [any, any]
    const quizId = result.insertId

    if (data.questions?.length) {
      for (const [i, q] of data.questions.entries()) {
        await pool.execute(
          'INSERT INTO quiz_questions (quiz_id, question, question_en, options_json, answer, explanation, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [quizId, q.question, q.question_en ?? null, JSON.stringify(q.options_json || {}), q.answer, q.explanation ?? null, i],
        )
      }
    }

    const [rows] = await pool.query('SELECT * FROM quizzes WHERE id = ?', [quizId]) as [any[], any]
    return rows[0]
  }

  static async update(quizId: number, data: Partial<Quiz>) {
    if (data.title !== undefined) {
      await pool.execute('UPDATE quizzes SET title = ? WHERE id = ?', [data.title, quizId])
    }
    const [rows] = await pool.query('SELECT * FROM quizzes WHERE id = ?', [quizId]) as [any[], any]
    return rows[0]
  }
}
