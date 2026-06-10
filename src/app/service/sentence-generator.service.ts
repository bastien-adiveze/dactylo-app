import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WordGeneratorService {
  constructor(private http: HttpClient) {}

  readWordsFile(filePath: string): Observable<string[]> {
    return this.http.get(filePath, { responseType: 'text' }).pipe(
      map(content => content.split('\n').filter(word => word.trim()))
    );
  }

  generateRandomSentence(words: string[], wordCount: number = 5): string {
    const sentence = [];
    for (let i = 0; i < wordCount; i++) {
      const randomIndex = Math.floor(Math.random() * words.length);
      sentence.push(words[randomIndex]);
    }
    return sentence.join(' ');
  }
}