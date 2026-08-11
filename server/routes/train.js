import { Router } from 'express';
const router = Router();
import { prisma } from '../db.js';
import { xpTable } from '../data/xpTable.js';



router.get('/:rsn', async (req, res) => {
    const rsn = req.params.rsn;
    const skill = req.query.skill?.toLowerCase();
    const target = parseInt(req.query.target);

    if (!skill || Number.isNaN(target)) {
        return res.status(400).json({
            error: 'skill and target are required, e.g. ?skill=ranged&target=70'
        });
    }

    try {
        const player = await prisma.player.findUnique({
            where: {rsn: rsn.toLowerCase()},
            include: {skills:true}
        })

        if(!player){
            return res.status(404).json({ error: 'Player not found. Hit /api/player/:rsn first to seed them.' });
        }

        const skillsRow = player.skills.find(s => s.name === skill)

        if(!skillsRow){
            return res.status(400).json({error: `Skill '${skill}' not found for this player`})
        }

        if (target < 1 || target > 99) {
            return res.status(400).json({ error: 'target must be between 1 and 99' });
        }

        const xpNeeded = xpTable[target] - skillsRow.xp;

        const methods = await prisma.trainingMethod.findMany({
            where: {
                skill:skill,
                fromLevel:{ lte: target },
                toLevel:{ gte: skillsRow.level }
            }
        })



        res.json({rsn, skill, target, currentLevel:skillsRow.level, currentXp:skillsRow.xp, xpNeeded,methods})

        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;