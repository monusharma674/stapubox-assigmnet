export type ContentType = "mcq" | "true_false" | "poll" | "fill_blank" | "guess_number"
export type Option = { label: string; text: string }
export type Source = { title: string; url: string; statement: string; publication_date?: string; retrieved_date: string; access_date: string }
export type Question = { id:number; batch_id:number; sport:string; difficulty:string; era:string; type:ContentType; prompt:string; correct_answer?:string|null; explanation?:string|null; opinion_based:boolean; confidence_score:number; quality_score:number; fact_check_status:string; semantic_duplicate_score:number; saved:boolean; created_at:string; options:Option[]; sources:Source[] }
export type Batch = { id:number; sport:string; difficulty:string; time_scope:string; model_used:string; retrieval_method:string; created_at:string; questions:Question[] }
