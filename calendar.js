class ChineseCalendar {
    constructor() {
      this.dizhiHours = [
        { name: '子時', start: 23, end: 1, num: 1 },
        { name: '丑時', start: 1, end: 3, num: 2 },
        { name: '寅時', start: 3, end: 5, num: 3 },
        { name: '卯時', start: 5, end: 7, num: 4 },
        { name: '辰時', start: 7, end: 9, num: 5 },
        { name: '巳時', start: 9, end: 11, num: 6 },
        { name: '午時', start: 11, end: 13, num: 7 },
        { name: '未時', start: 13, end: 15, num: 8 },
        { name: '申時', start: 15, end: 17, num: 9 },
        { name: '酉時', start: 17, end: 19, num: 10 },
        { name: '戌時', start: 19, end: 21, num: 11 },
        { name: '亥時', start: 21, end: 23, num: 12 }
      ];
  
      this.numberMeanings = {
        1: '大安',
        2: '留連',
        3: '速喜',
        4: '赤口',
        5: '小吉',
        6: '空亡',
        7: '病符',
        8: '桃花',
        9: '天德'
      };
  
      this.hexagramDetails = {
        1: {
          name: '大安',
          meaning: '長期 緩慢 穩定',
          element: '木',
          direction: '正東方',
          description: '大安為最吉，求安穩為吉，求變化為不吉'
        },
        2: {
          name: '留連',
          meaning: '停止 反覆 複雜',
          element: '木',
          direction: '西南方',
          description: '想挽留是吉，不想挽留為噁心'
        },
        3: {
          name: '速喜',
          meaning: '驚喜 快速 突然',
          element: '火',
          direction: '正南',
          description: '意想不到的好事'
        },
        4: {
          name: '赤口',
          meaning: '鬥爭 兇惡 傷害',
          element: '金',
          direction: '正西方',
          description: '吵架 打架 鬥爭 訴訟是非肉體傷害'
        },
        5: {
          name: '小吉',
          meaning: '起步 不多 尚可',
          element: '水',
          direction: '正北',
          description: '成中有缺，適合起步'
        },
        6: {
          name: '空亡',
          meaning: '失去 虛偽 空想',
          element: '土',
          direction: '內部',
          description: '先得再失，尤其忌會金錢。可以接觸玄學 哲學 心理學'
        },
        7: {
          name: '病符',
          meaning: '病態 異常 治療',
          element: '金',
          direction: '西南',
          description: '先有病，才需要"治療"' // Keep escaped quotes
        },
        8: {
          name: '桃花',
          meaning: '慾望 牽絆 異性',
          element: '土',
          direction: '東北',
          description: '人際關係，牽絆此事'
        },
        9: {
          name: '天德',
          meaning: '貴人 上司 高遷',
          element: '金',
          direction: '西北',
          description: '求人辦事，靠人成事'
        }
      };
    }
  
    getDizhiHour(hour) {
      // 驗證輸入
      if (typeof hour !== 'number' || hour < 0 || hour >= 24) {
        console.error('Invalid hour input:', hour);
        return null; // 或者返回一個預設值或錯誤對象
      }
      hour = Math.floor(hour); // 確保是整數
  
      // 子時跨日處理 (23:00 - 00:59)
      if (hour >= 23 || hour < 1) {
        return this.dizhiHours[0]; // 返回子時
      }
  
      // 處理其他時辰 (1:00 - 22:59)
      for (let dizhi of this.dizhiHours) {
        // 跳過子時，因為已經處理過
        if (dizhi.name === '子時') continue;
  
        if (dizhi.start <= hour && hour < dizhi.end) {
          return dizhi;
        }
      }
  
      // 理論上不會執行到這裡，除非 dizhiHours 數據有誤
      console.error('Could not determine Dizhi hour for:', hour);
      return null;
    }
  
    getLunarDate(date) {
      // 確保傳入的是 Date 對象
      if (!(date instanceof Date) || isNaN(date.getTime())) { // Also check for invalid Date
        console.error('Invalid date object passed to getLunarDate:', date);
        return { month: -1, day: -1, isLeap: false }; // 返回錯誤標識
      }
      // 確保 Lunar 類已載入
      if (typeof Lunar === 'undefined' || !Lunar || !Lunar.fromDate) {
           console.error('Lunar class or Lunar.fromDate method is not available.');
           return { month: -1, day: -1, isLeap: false };
      }
  
      const lunar = Lunar.fromDate(date); // 調用 Lunar 類的方法
      return {
        month: lunar.getMonth(),  // 獲取農曆月
        day: lunar.getDay(),       // 獲取農曆日
        isLeap: lunar.isLeapMonth() // 獲取是否閏月
      };
    }
  
    calculateSanTran(lunarMonth, lunarDay, dizhiNum) {
      // 驗證輸入
      if (![lunarMonth, lunarDay, dizhiNum].every(n => typeof n === 'number' && n > 0 && Number.isInteger(n))) {
          console.error('Invalid input for calculateSanTran:', { lunarMonth, lunarDay, dizhiNum });
          return null; // 或返回錯誤標識
      }
  
      // 採用原始、經過驗證的循環邏輯：
      // 從1數 (月數-1) 次, 從初傳數 (日數-1) 次, 從中傳數 (時辰數-1) 次
      let first = 1;
      for (let i = 1; i < lunarMonth; i++) {
          first = (first % 9 === 0) ? 1 : first + 1;
      }
      let second = first;
      for (let i = 1; i < lunarDay; i++) {
          second = (second % 9 === 0) ? 1 : second + 1;
      }
      let third = second;
      for (let i = 1; i < dizhiNum; i++) {
          third = (third % 9 === 0) ? 1 : third + 1;
      }
  
      // 再次驗證結果是否在 1-9 之間 (理論上循環不會出錯)
      if (![first, second, third].every(n => n >= 1 && n <= 9)) {
          console.error('Calculation resulted in invalid number:', { first, second, third });
          return null; // 計算出錯
      }
  
      return {
          first: {
              number: first,
              name: this.numberMeanings[first]
          },
          second: {
              number: second,
              name: this.numberMeanings[second]
          },
          third: {
              number: third,
              name: this.numberMeanings[third]
          }
      };
    }
  
    analyzeElements(firstNum, secondNum, thirdNum) {
      // 驗證輸入是 1-9 的數字
      if (![firstNum, secondNum, thirdNum].every(n => n >= 1 && n <= 9 && Number.isInteger(n))) {
          console.error('Invalid number input for analyzeElements:', { firstNum, secondNum, thirdNum });
          return [];
      }
  
      // 檢查 hexagramDetails 是否存在對應的鍵
       if (!this.hexagramDetails[firstNum] || !this.hexagramDetails[secondNum] || !this.hexagramDetails[thirdNum]) {
           console.error('Missing hexagram details for numbers:', { firstNum, secondNum, thirdNum });
           return [];
       }
  
  
      const relationships = [];
      const firstElement = this.hexagramDetails[firstNum].element;
      const secondElement = this.hexagramDetails[secondNum].element;
      const thirdElement = this.hexagramDetails[thirdNum].element;
  
       // 確保元素有效
       if (!firstElement || !secondElement || !thirdElement) {
           console.error('Missing element in hexagram details for numbers:', { firstNum, secondNum, thirdNum });
           return [];
       }
  
      // 分析初傳和中傳
      relationships.push({
          from: `初傳 (${firstElement})`,
          to: `中傳 (${secondElement})`,
          relation: this.analyzeElementRelation(firstElement, secondElement)
      });
  
      // 分析中傳和末傳
      relationships.push({
          from: `中傳 (${secondElement})`,
          to: `末傳 (${thirdElement})`,
          relation: this.analyzeElementRelation(secondElement, thirdElement)
      });
  
      // 分析初傳和末傳 (有時也看這個)
      relationships.push({
          from: `初傳 (${firstElement})`,
          to: `末傳 (${thirdElement})`,
          relation: this.analyzeElementRelation(firstElement, thirdElement)
      });
  
      return relationships;
    }
  
    analyzeElementRelation(element1, element2) {
      const cycle = {
        '木': { generates: '火', controls: '土', generatedBy: '水', controlledBy: '金' },
        '火': { generates: '土', controls: '金', generatedBy: '木', controlledBy: '水' },
        '土': { generates: '金', controls: '水', generatedBy: '火', controlledBy: '木' },
        '金': { generates: '水', controls: '木', generatedBy: '土', controlledBy: '火' },
        '水': { generates: '木', controls: '火', generatedBy: '金', controlledBy: '土' }
      };
  
      if (!cycle[element1] || !cycle[element2]) {
          console.error('Invalid element input:', element1, element2);
          return '元素錯誤';
      }
  
      if (element1 === element2) {
        return '比和'; // 五行相同叫比和
      }
      if (cycle[element1].generates === element2) {
        return '生'; // Element1 generates Element2
      }
      if (cycle[element1].controls === element2) {
        return '剋'; // Element1 controls Element2
      }
      if (cycle[element1].generatedBy === element2) {
        // return '被生'; // Element1 is generated by Element2 (element2 生 element1)
        return `${element2}生${element1}`;
      }
      if (cycle[element1].controlledBy === element2) {
        // return '被剋'; // Element1 is controlled by Element2 (element2 剋 element1)
        return `${element2}剋${element1}`;
      }
  
      // 這個情況理論上不會發生
      console.warn('Could not determine direct relationship:', element1, element2);
      return '關係不明';
    }
  
    calculateExtraHexagrams(input, lastSanTranNumber) {
       // 驗證 lastSanTranNumber
      if (typeof lastSanTranNumber !== 'number' || lastSanTranNumber < 1 || lastSanTranNumber > 9 || !Number.isInteger(lastSanTranNumber)) {
          console.error('Invalid lastSanTranNumber:', lastSanTranNumber);
          return [];
      }
      // 驗證 input
      if (typeof input !== 'string') {
          console.error('Invalid input type for extra hexagrams:', typeof input);
          return [];
      }
  
      // console.log('Starting extra calculation with:', {
      //     input: input,
      //     lastNumber: lastSanTranNumber
      // });
  
      const numbersToProcess = this.processInput(input);
      // console.log('Processed numbers for extra calculation:', numbersToProcess);
  
      const results = [];
      let currentNumber = lastSanTranNumber;
  
      // 處理輸入的數字序列
      for (let i = 0; i < numbersToProcess.length; i++) {
          const count = numbersToProcess[i];
  
          // 如果是0，跳過 (按原始邏輯)
          if (count === 0) {
              // console.log(`Skipping zero at extra input position ${i}`);
              continue;
          }
          // 輸入數字必須大於0
          if (count < 1) {
              console.warn(`Skipping invalid count ${count} at extra input position ${i}`);
              continue;
          }
  
          // 計算下一個數字：從 currentNumber 開始數 count-1 次
          let nextNumber = currentNumber;
          for (let j = 1; j < count; j++) {
              nextNumber = (nextNumber % 9 === 0) ? 1 : nextNumber + 1;
          }
  
           // 驗證計算出的 nextNumber 是否有效 (理論上循環不會出錯)
          if (nextNumber < 1 || nextNumber > 9) {
              console.error('Invalid number calculated in extra hexagrams:', nextNumber);
              continue; // 跳過這個結果
          }
  
           // 檢查 hexagramDetails 是否存在
           if (!this.numberMeanings[nextNumber] || !this.hexagramDetails[nextNumber]) {
               console.error('Missing details for calculated extra number:', nextNumber);
               continue; // 跳過缺少詳情的結果
           }
  
          // 添加結果
          results.push({
              number: nextNumber,
              name: this.numberMeanings[nextNumber],
              details: this.hexagramDetails[nextNumber]
          });
          // console.log(`Extra result ${results.length}: ${nextNumber} (${this.numberMeanings[nextNumber]})`);
  
          // 更新當前數字，為下一次計算做準備
          currentNumber = nextNumber;
      }
  
      // console.log('Final extra results:', results);
      return results;
    }
  
    processInput(input) {
      // 驗證輸入
      if (typeof input !== 'string') {
          console.error('Invalid input type for processInput:', typeof input);
          return [];
      }
  
      // console.log('Processing input string:', input);
      const processedNumbers = [];
  
      // 移除空格並轉大寫
      const cleanedInput = input.replace(/\s/g, '').toUpperCase();
  
      // 處理輸入字符
      for (let i = 0; i < cleanedInput.length; i++) {
          const char = cleanedInput[i];
  
          if (/[0-9]/.test(char)) {
              // 如果是數字，直接添加
              processedNumbers.push(parseInt(char, 10));
          } else if (/[A-Z]/.test(char)) {
              // 如果是字母，計算序號（A=1, B=2, ... Z=26）
              let num = char.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
              // 取除以9的餘數，餘數為0則算作9
              let result = num % 9;
              result = (result === 0) ? 9 : result;
              processedNumbers.push(result);
          } else {
              // 忽略無效字符
              console.warn(`Ignoring invalid character in input: '${char}'`);
          }
      }
  
      // console.log('Processed input into numbers:', processedNumbers);
      return processedNumbers;
    }
  }
  
  // 確保 ChineseCalendar 類可以被其他文件訪問
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChineseCalendar;
  } else {
    // 在瀏覽器環境下，掛載到 window
    window.ChineseCalendar = ChineseCalendar;
  }