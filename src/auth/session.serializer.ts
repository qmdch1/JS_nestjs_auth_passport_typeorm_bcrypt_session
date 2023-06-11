import { Injectable } from "@nestjs/common";
import {PassportSerializer} from '@nestjs/passport';
import { PassportStatic } from "passport";
import { UserService } from "src/user/user.service";

@Injectable()
export class SessionSerializer extends PassportSerializer{
    constructor(private userService: UserService){
        super();
    }

    // 세션 정보 저장
    serializeUser(user: any, done: (err: Error, user: any) => void): any{
        console.log("세션저장");
        done(null, user.email);
    }

    // 세션 정보 반환
    async deserializeUser( payload: any, done: (err: Error, payload: any) => void): Promise<any> {
        const user = await this.userService.getUser(payload);
        if (!user){
            done(new Error('No User'), null);
            return;
        }

        const { password, ...userInfo } = user;
        done(null, userInfo);
    }

    // 패스포트 인스턴스를 가져오며, 패스포트 인스턴스의 데이터가 필요한 경우 사용합니다. 본 예제에서는 사용하지 않습니다.
    // getPassportInstance(): PassportStatic {
    //     return;
    // }
}