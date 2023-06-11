import { Injectable } from "@nestjs/common";
import {PassportStrategy} from '@nestjs/passport';
import { Strategy } from "passport-local";
import { AuthService } from "./auth.service";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy){
    constructor(private authService: AuthService){
        // 기본값이 username이니 email로 변경
        super({ usernameField: 'email'});
    }

    async validate(email: string, password: string): Promise<any> {
        console.log("validate 실행");
        const user = await this.authService.validateUser(email, password);
        if(!user){
            return null;
        }
        return user;
    }

}