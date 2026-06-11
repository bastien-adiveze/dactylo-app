import { Component, HostListener, signal, OnInit } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';


@Component({
  selector: 'app-root',
  imports: [DecimalPipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  nbWords = 10;
  motsList: string[] = [];
  protected readonly title = signal('dactylo-app');
  txtCible :string[]=[];
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
  wpmBurst: number[] = [];
  wpmBurstRawEvolution: number[] = [];
  tempCorrectChars:number = 0;
  chart: any = null;
  lastKeyPressed : string = "Shift";
  withNumber : boolean =true;
  withUpperCase:boolean=true;
  touchesDeControle = [
  'Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 
  'CapsLock', 'NumLock', 'ScrollLock', 
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 
  'Home', 'End', 'PageUp', 'PageDown', 
  'Escape', 'Insert', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  'Dead'
  ];
  testType : string = 'words';
  isMenuOpen: boolean = false;
  timeLimit :number =30;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.chargerMots();
  }

  chargerMots() {
    this.http.get('words_fr.txt', { responseType: 'text' }).subscribe({
      next: (content) => {
        this.motsList = content
          .split('\n')
          .map(word => word.trim())
          .filter(word => word.length > 0);
        if (this.motsList.length > 0) {
          this.txtCible = this.genererPhrase(this.nbWords);
        }
      },
      error: (err) => {
        this.motsList = ["le", "plus", "grand", "danger", "pour", "la", "plupart", "d'entre", "nous", "n'est", "pas", "que", "notre", "objectif", "soit", "trop", "élevé"];
        this.txtCible = this.genererPhrase(this.nbWords);
      }
    });
  }

  @HostListener('window:keydown', ['$event'])
  gererFrappe(e: KeyboardEvent) {
    if(e.key==="Enter"){
      if(this.lastKeyPressed==="Shift")
          this.restartTest(true);
      if(this.lastKeyPressed==="Tab")
        this.restartTest(false)
      return;
      }
    if(e.key==="Tab"||e.key==="Enter")
      e.preventDefault()
    
    if(this.txtSaisie.length < this.txtCible.length) {
      if (e.key.length === 1) {
        if (this.txtSaisie.length === 0 && !this.tempsDebut) {
          this.tempsDebut = Date.now();
          this.lancerHorloge();
        }
        this.txtSaisie += e.key;
        if (e.key === this.txtCible[this.txtSaisie.length - 1]) {
          this.correctChars++;
          this.tempCorrectChars++;
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
            this.tempCorrectChars--;
          }else {
            this.incorrectChars--;
          }
          this.txtSaisie = this.txtSaisie.slice(0, -1);
        }
      }
      if(!this.touchesDeControle.includes(e.key))
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

  restartTest(newTxt :boolean) {
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
    this.Duree = 0;
    this.tempCorrectChars = 0;
    this.wpmBurst = [];
    this.wpmBurstRawEvolution = [];
    if(newTxt)
      this.txtCible = this.genererPhrase(this.nbWords);
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

  calculateConsistency(): number {
    if(this.wpmBurstRawEvolution.length===0)
      return 100
    let moyenne= 0;
      for(let j=0; j<this.wpmBurstRawEvolution.length;j++){
        moyenne += this.wpmBurstRawEvolution[j];
      }
      moyenne=moyenne/this.wpmBurstRawEvolution.length;
    let variance = 0;
    for (let i = 0; i < this.wpmBurstRawEvolution.length; i++) {
      variance += Math.pow(this.wpmBurstRawEvolution[i] - moyenne, 2);
    }
    variance=Math.sqrt(variance/this.wpmBurstRawEvolution.length);
    if(moyenne ===0)
      return 0
    return(Math.max(0,(100*(1-(variance/moyenne)))))
  }

  lancerHorloge() {
    let counter = 0;
    this.horlogeId = setInterval(() => { 
      this.wpmEvolution.push(this.calculateWpm(this.correctChars));
      this.rawWpmEvolution.push(this.calculateWpm(this.totKeyPressed));
      switch(counter){
        case 0:
          this.wpmBurst.push(this.tempCorrectChars*12);
          break;
        case 1:
          this.wpmBurst.push((this.tempCorrectChars*12+this.wpmBurstRawEvolution[0])/2);
          break;
        default:
          this.wpmBurst.push((this.tempCorrectChars*12+this.wpmBurstRawEvolution[counter-1]+this.wpmBurstRawEvolution[counter-2])/3);
          break;
      }
      this.wpmBurstRawEvolution.push(this.tempCorrectChars*12);
      this.tempCorrectChars = 0;
      counter++;
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
      if(this.Duree%1 !=0)
        this.wpmBurst.push((this.tempCorrectChars/5*60/(this.Duree%1)+this.wpmBurstRawEvolution[this.wpmBurstRawEvolution.length-1]+this.wpmBurstRawEvolution[this.wpmBurstRawEvolution.length-2])/3);
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
          fill: false,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 6,
          pointBackgroundColor: '#e2b714'
        },
        {
          label: 'Raw Speed (WPM)',
          data: this.rawWpmEvolution,
          borderColor: '#3a3b3e',
          backgroundColor: 'rgba(58, 59, 62, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 6,
          pointBackgroundColor: '#3a3b3e'
        },
        {
          label: 'Burst Speed (WPM)',
          data: this.wpmBurst,
          borderColor: '#ff6b6b',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 6,
          pointBackgroundColor: '#ff6b6b'
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
          legend: { 
            display: true,
            position: 'top',
            labels: {
              color: '#d1d0c5',
              font: {
                size: 14,
                family: "'Courier New', Courier, monospace"
              },
              usePointStyle: true,
              padding: 20 
            }
          }
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

  incrementSetting() {
    if(this.testType==='words'){
      this.nbWords += 5;
      this.restartTest(true);
    }else if(this.testType==='time'){
      this.timeLimit+=10;
    }
  }

  decrementSetting() {
    if(this.testType==='words'){
      if (this.nbWords > 5) {
        this.nbWords -= 5;
        this.restartTest(true);
      }
    }else if(this.testType==='time'&&this.timeLimit>10){
      this.timeLimit-=10;
    }
  }
  genererPhrase(nbWords: number): string[] {
    if (this.motsList.length === 0) return [];
    let phrase = "";
    let random=0;
    let flag:boolean = false;
    for (let i = 0; i < nbWords; i++) {
      if(this.withNumber){
        random=Math.floor(Math.random()*7);
        if(random===0){
          for(let j =0;j<Math.floor(Math.random()*4)+1;j++){
            phrase+=Math.floor(Math.random()*10);
          }
          phrase+=(i < nbWords - 1 ? ' ' : '');
          flag=true;
        } 
      } 
      if(!flag){
        let mot = this.motsList[Math.floor(Math.random() * this.motsList.length)];
        if(this.withUpperCase){
          random=Math.floor(Math.random()*7);
          if(random===0)
            mot = mot.charAt(0).toUpperCase() + mot.slice(1);
        }
        phrase += mot + (i < nbWords - 1 ? ' ' : '');
        
      }
      flag=false;
    }
    return phrase.split('');
  }
  changeFlag(option: 'withNumber' | 'withUpperCase'){
    this[option]=!this[option];
    this.restartTest(true);
  }
  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

selectMode(mode: string) {
  this.testType = mode;
  this.isMenuOpen = false;
}

}
