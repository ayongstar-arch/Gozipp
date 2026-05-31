import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiUrl: string;
  private readonly modelName: string;

  constructor(private configService: ConfigService) {
    this.aiUrl = this.configService.get<string>('LOCAL_AI_URL') || 'http://localhost:11434/api/generate';
    this.modelName = this.configService.get<string>('LOCAL_AI_MODEL') || 'typhoon';
  }

  /**
   * Core generation logic using Local ThaiLLM
   */
  async generateResponse(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const fullPrompt = systemPrompt ? `${systemPrompt}\n\nUser: ${prompt}` : prompt;

      const response = await axios.post(this.aiUrl, {
        model: this.modelName,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
        },
      }, {
        timeout: 30000, // LLMs take time
      });

      return response.data.response;
    } catch (error) {
      this.logger.error(`AI Generation Failed: ${error.message}`);
      return 'ขออภัย ระบบวิเคราะห์อัจฉริยะขัดข้องชั่วคราว ไม่สามารถสรุปข้อมูลได้ในขณะนี้';
    }
  }

  /**
   * Specific helper for Admin Operational Summary
   */
  async summarizeOperations(stats: any): Promise<string> {
    const systemInstruction = `คุณคือ AI ผู้เชี่ยวชาญด้านการวิเคราะห์ธุรกิจ Mobility สำหรับแพลตฟอร์ม GOZIPP
จงสรุปข้อมูลสถิติรายวันให้เป็นภาษาไทยที่กระชับ เป็นมืออาชีพ และให้คำแนะนำเชิงกลยุทธ์ 1 ข้อ
ห้ามใช้คำศัพท์ภาษาอังกฤษที่ยากเกินไป`;

    const prompt = `ข้อมูลสถิติวันนี้:
ยอดรายได้รวม: ${stats.revenue} บาท
จำนวนเที่ยววิ่ง: ${stats.rides} เที่ยว
จำนวนคนขับออนไลน์: ${stats.activeDrivers} คน
พื้นที่ที่คนเรียกเยอะที่สุด: ${stats.topArea}
สถิติการยกเลิก: ${stats.cancellationRate}%

จงวิเคราะห์ข้อมูลนี้:`;

    return this.generateResponse(prompt, systemInstruction);
  }

  /**
   * Helper to fix Thai addresses
   */
  async sanitizeThaiAddress(rawAddress: string): Promise<string> {
    const prompt = `จงแก้ไขชื่อที่อยู่ภาษาไทยต่อไปนี้ให้ถูกต้องตามหลักการเขียนที่อยู่ (ซอย, แขวง, เขต) และแก้ไขคำสะกดผิด: "${rawAddress}"
ตอบเฉพาะชื่อที่อยู่ที่แก้ไขแล้วเท่านั้น`;

    return this.generateResponse(prompt);
  }
}
