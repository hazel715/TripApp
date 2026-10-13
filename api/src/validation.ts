import { z } from "zod";
export const id=z.uuid();
export const params=z.object({id,expenseId:id.optional(),userId:id.optional()});
export const currency=z.string().regex(/^[A-Za-z]{3}$/).transform(s=>s.toUpperCase());
export const amount=z.string().regex(/^-?\d{1,14}(?:\.\d{1,4})?$/);
export const expenseBody=z.object({payerUserId:id,categoryId:id.nullable().optional(),description:z.string().trim().min(1).max(1000),amount,currency,fxRate:z.string().regex(/^\d{1,10}(?:\.\d{1,8})?$/).nullable().optional(),settlementAmount:amount,settlementCurrency:currency,expenseDate:z.iso.date().nullable().optional(),shares:z.array(z.object({userId:id,shareAmount:amount})).min(1).max(100).optional(),participantUserIds:z.array(id).min(1).max(100).optional()}).strict();
