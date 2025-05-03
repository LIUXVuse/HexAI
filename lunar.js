class Lunar {
  static lunarInfo = [
    0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
    0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
    0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
    0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
    0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
    0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
    0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
    0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
    0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
    0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
    0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
    0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
    0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
    0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
    0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
    0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
    0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4
  ];

  constructor() {
    this.month = 0;
    this.day = 0;
    this.isLeap = false; // 添加標記是否為閏月
  }


  static fromDate(date) {
    if (!(date instanceof Date)) {
        console.error("Invalid input: fromDate expects a Date object.");
        // 返回一個表示錯誤的 Lunar 對象或 null
        const errorLunar = new Lunar();
        errorLunar.month = -1; // 或其他錯誤標記
        errorLunar.day = -1;
        return errorLunar;
    }

    const lunar = new Lunar();
    let i, leap = 0, temp = 0;
    const baseDate = new Date(1900, 0, 31); // 注意月份是從0開始的
    let offset = Math.floor((date.getTime() - baseDate.getTime()) / 86400000); // 使用 getTime()

    if (offset < 0) {
         console.error("Date is before the base date (1900-01-31).");
         const errorLunar = new Lunar();
         errorLunar.month = -1;
         errorLunar.day = -1;
         return errorLunar;
    }


    // 找出年份
    for(i = 1900; i < 2200 && offset >= 0; i++) { // 修正條件 offset >= 0
      temp = this.lYearDays(i);
      offset -= temp;
    }


    // 如果 offset 變為負數，表示日期在上一年的最後幾天
    if(offset < 0) {
      offset += temp; // 加回最後一年的天數
      i--; // 年份退回一年
    }


    const currentYear = i;
    leap = this.leapMonth(i); // 獲取閏月是幾月，0表示無閏月
    lunar.isLeap = false; // 初始化 isLeap


    // 找出月份
    for(i = 1; i < 13 && offset >= 0; i++) { // 修正條件 offset >= 0
      // 先處理閏月
      if(leap > 0 && i === (leap + 1) && lunar.isLeap === false) {
        // 遇到閏月位置，先計算閏月天數
        temp = this.leapDays(currentYear);
        if (offset - temp < 0) { // 如果 offset 不夠減去閏月天數，說明就在閏月裡
             lunar.isLeap = true; // 標記為閏月
        } else {
             // 夠減去閏月天數，說明日期在閏月之後
             offset -= temp;
             temp = this.monthDays(currentYear, i); // 計算當前公曆月的農曆天數
             lunar.isLeap = false; // 確保標記不是閏月
        }
      } else {
        // 非閏月或已經處理過閏月
        temp = this.monthDays(currentYear, i);
        lunar.isLeap = false;
      }


      // 再次檢查 offset
       if (offset - temp < 0) {
          break; // 找到月份了，跳出循環
       }
      offset -= temp;
    }

     // 循環結束後 i 就是農曆月份
    lunar.month = i;
    // offset 就是當月的天數偏移量（從0開始），加1即為日期
    lunar.day = offset + 1;

    // 修正：如果正好是某月最後一天，offset會是0，導致日期錯誤
    // 上面的邏輯在 offset >= 0 時循環， offset < 0 時跳出，所以 offset+1 是正確的日期

    return lunar;
  }

  static lYearDays(y) {
    // 保持不變
    if (y < 1900 || y > 2200) {
       console.error('年份超出範圍（1900-2200） in lYearDays:', y);
       return 0; // 返回0或其他錯誤值
    }
    let i, sum = 348;
    for(i = 0x8000; i > 0x8; i >>= 1) {
      sum += (this.lunarInfo[y - 1900] & i) ? 1 : 0;
    }
    return sum + this.leapDays(y);
  }

  static leapMonth(y) {
    // 保持不變
    if (y < 1900 || y > 2200) {
      console.error('年份超出範圍（1900-2200） in leapMonth:', y);
      return 0;
    }
    return this.lunarInfo[y - 1900] & 0xf;
  }

  static leapDays(y) {
    // 保持不變
     if (y < 1900 || y > 2200) {
       console.error('年份超出範圍（1900-2200） in leapDays:', y);
       return 0;
     }
    if(this.leapMonth(y)) {
      return (this.lunarInfo[y - 1900] & 0x10000) ? 30 : 29;
    }
    return 0;
  }

  static monthDays(y, m) {
     // 保持不變
     if (y < 1900 || y > 2200) {
       console.error('年份超出範圍（1900-2200） in monthDays:', y);
       return 0;
     }
    if(m > 12 || m < 1) {
       console.error('月份超出範圍（1-12） in monthDays:', m);
      return 0; // 返回0表示錯誤
    }
    // 判斷該年該月是大月還是小月
    return (this.lunarInfo[y - 1900] & (0x10000 >> m)) ? 30 : 29;
  }

  getMonth() {
    return this.month;
  }

  getDay() {
    return this.day;
  }

  isLeapMonth() {
      return this.isLeap;
  }
}

// 確保 Lunar 類可以被其他文件訪問 (保持不變)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Lunar;
} else {
  // 在瀏覽器環境下，掛載到 window
  window.Lunar = Lunar;
} 