import { Component, HostListener, signal } from '@angular/core';
import { Chart } from 'chart.js/auto';
import {DecimalPipe} from '@angular/common';


@Component({
  selector: 'app-root',
  imports: [DecimalPipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  nbWords = 10;
  protected readonly title = signal('dactylo-app');
  txtCible = this.genererPhrase(this.nbWords);
  txtSaisie = "";
  correctChars = 0;
  incorrectChars = 0;
  incorrectCharsTotal = 0;
  totKeyPressed = 0;
  tempsDebut: number | null = null;
  tempsFin: number | null = null;
  Duree: number = 0;
  horlogeId: any = null;
  wpmEvolution: number[] = [];
  rawWpmEvolution: number[] = [];
  chart: any = null;
  lastKeyPressed : string = "Shift";
  

  @HostListener('window:keydown', ['$event'])
  gererFrappe(e: KeyboardEvent) {
    if(e.key==="Enter"&&this.lastKeyPressed==="Shift"){
        this.restartTest();
        return;
      }
    if(e.key==="Tab"){
      e.preventDefault();
      return;
    }
    if(this.txtSaisie.length < this.txtCible.length) {
      if (e.key.length === 1) {
        if (this.txtSaisie.length === 0 && !this.tempsDebut) {
          this.tempsDebut = Date.now();
          this.lancerHorloge();
        }
        this.txtSaisie += e.key;
        if (e.key === this.txtCible[this.txtSaisie.length - 1]) {
          this.correctChars++;
        } else {
          this.incorrectChars++;
          this.incorrectCharsTotal++;
        }
      }else if (e.key === "Enter") {
        this.txtSaisie += "\n";
      }
      else if (e.key === "Backspace") {
        if (this.txtSaisie.length > 0) {
          if (this.txtSaisie[this.txtSaisie.length - 1] === this.txtCible[this.txtSaisie.length - 1]) {
            this.correctChars--;
          }else {
            this.incorrectChars--;
          }
          this.txtSaisie = this.txtSaisie.slice(0, -1);
        }
      }
      this.totKeyPressed++; 
      if (this.txtSaisie.length === this.txtCible.length) {
        this.stopHorloge();
        setTimeout(() => {
          this.dessinerGraphique();
        }, 100);
      }
    }
      this.lastKeyPressed = e.key;
  }  



  obtenirStatutLettre(index: number): string {
    if (index < this.txtSaisie.length) {
      return this.txtSaisie[index] === this.txtCible[index] ? 'correct' : 'incorrect';
    }else if (index === this.txtSaisie.length) {
      return 'next';
    } 
    else {
      return 'pending';
    }
  }

  calculateWpm(input : number): number {
    if (!this.tempsDebut) {
      return 0;
    }
    let timeInMinutes: number | null = null;
    if (this.tempsFin === null) {
      timeInMinutes = (Date.now() - this.tempsDebut) / 60000;
    }else{
      timeInMinutes = (this.tempsFin - this.tempsDebut) / 60000;
    }
    return (input / 5) / timeInMinutes;
  }

  restartTest() {
    this.txtSaisie = "";
    this.correctChars = 0;
    this.incorrectChars = 0;
    this.incorrectCharsTotal = 0;
    this.tempsDebut = null;
    this.tempsFin = null;
    this.stopHorloge();
    this.wpmEvolution = [];
    this.rawWpmEvolution = [];
    this.totKeyPressed = 0;
    this.txtCible = this.genererPhrase(this.nbWords);
    this.Duree = 0;
  }

  calculateAccuracy(): number {
    if (this.txtSaisie.length === 0) {
      return 0;
    }
    const accuracy = ((this.txtSaisie.length - this.incorrectCharsTotal) / (this.txtSaisie.length) * 100);
    if (accuracy < 0) {
      return 0;
    }
    return accuracy;
  }

  lancerHorloge() {
    this.horlogeId = setInterval(() => { 
      this.wpmEvolution.push(this.calculateWpm(this.correctChars));
      this.rawWpmEvolution.push(this.calculateWpm(this.totKeyPressed));
    }, 1000);
  }
  stopHorloge() {
    if (this.tempsDebut) {
      this.tempsFin = Date.now();
      this.Duree = Math.max(this.tempsFin - this.tempsDebut, 0) / 1000;
    }
    if (this.horlogeId) {
      clearInterval(this.horlogeId);
      this.horlogeId = null;
      this.wpmEvolution.push(this.calculateWpm(this.correctChars));
      this.rawWpmEvolution.push(this.calculateWpm(this.totKeyPressed));
    }
  }

  dessinerGraphique() {
    if (this.chart) {
      this.chart.destroy();
    }
    
    const labelsFrappes = this.wpmEvolution.map((_, index) => `Sec ${index + 1}`);
    labelsFrappes[labelsFrappes.length - 1] = this.Duree.toFixed(1) + 's';

    const canvas = document.getElementById('wpmChart') as HTMLCanvasElement;
    if (!canvas) return;

    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labelsFrappes,
        datasets: [{
          label: 'Speed (WPM)',
          data: this.wpmEvolution,
          borderColor: '#e2b714',
          backgroundColor: 'rgba(226, 183, 20, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4.5,
          pointHoverRadius: 6,
          pointBackgroundColor: '#e2b714'
        },
        {
          label: 'Raw Speed (WPM)',
          data: this.rawWpmEvolution,
          borderColor: '#3a3b3e',
          backgroundColor: 'rgba(58, 59, 62, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4.5,
          pointHoverRadius: 6,
          pointBackgroundColor: '#3a3b3e'
        }
      ]

      },
      options: {
        responsive: true,
        interaction: {
          mode: 'index',   
          intersect: false, 
        },
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: '#3a3b3e'
            },
            ticks: {
              color: '#646669'
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              display: false
            }
          }
        }
      }
    });
  }

  incrementWords() {
    this.nbWords += 10;
    this.restartTest();
  }

  decrementWords() {
    if (this.nbWords > 10) {
      this.nbWords -= 10;
      this.restartTest();
    }
  }
  genererPhrase(nbWords: number): string {
    const mots = ["le", "plus", "grand", "danger", "pour", "la", "plupart", "d'entre", "nous", "n'est", "pas", "que", "notre", "objectif", "soit", "trop", "élevé", "et", "que", "nous le manquions", "mais", "qu'il soit trop bas et que nous l'atteignions"];
    let phrase = "";
    for (let i = 0; i < nbWords; i++) {
      const mot = mots[Math.floor(Math.random() * mots.length)];
      phrase += mot + (i < nbWords - 1 ? ' ' : '');
    }
    return phrase;
  }
}
